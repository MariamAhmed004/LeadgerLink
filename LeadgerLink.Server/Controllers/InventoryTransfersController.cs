using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/inventorytransfers")]
    public class InventoryTransfersController : ControllerBase
    {
        private readonly IInventoryTransferRepository _repository;
        private readonly LedgerLinkDbContext _context;
        private readonly ILogger<InventoryTransfersController> _logger;

        public InventoryTransfersController(IInventoryTransferRepository repository, LedgerLinkDbContext context, ILogger<InventoryTransfersController> logger)
        {
            _repository = repository;
            _context = context;
            _logger = logger;
        }

        // GET api/inventorytransfers/count?organizationId=5&from=2025-11-27&to=2025-11-27
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int organizationId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                var c = await _repository.CountTransfersByOrganizationAsync(organizationId, from, to);
                return Ok(c);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to count inventory transfers");
                return StatusCode(500, "Failed to count inventory transfers");
            }
        }

        // GET api/inventorytransfers/latest-for-current-store?pageSize=5
        // Returns up to pageSize latest transfers where the authenticated user's store is either from or to.
        [Authorize]
        [HttpGet("latest-for-current-store")]
        public async Task<ActionResult<IEnumerable<InventoryTransferOverviewDto>>> GetLatestForCurrentStore([FromQuery] int pageSize = 5)
        {
            const int MaxPageSize = 50;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.StoreId.HasValue) return Ok(Array.Empty<InventoryTransferOverviewDto>());

            var storeId = domainUser.StoreId.Value;

            var transfers = await _context.InventoryTransfers
                .Include(t => t.RequestedByNavigation)
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .Include(t => t.InventoryTransferStatus)
                .Where(t => t.FromStore == storeId || t.ToStore == storeId)
                .OrderByDescending(t => t.RequestedAt)
                .Take(pageSize)
                .Select(t => new InventoryTransferOverviewDto
                {
                    TransferId = t.InventoryTransferId,
                    Requester = t.RequestedByNavigation != null ? (t.RequestedByNavigation.UserFirstname + " " + t.RequestedByNavigation.UserLastname).Trim() : null,
                    FromStore = t.FromStoreNavigation != null ? t.FromStoreNavigation.StoreName : null,
                    ToStore = t.ToStoreNavigation != null ? t.ToStoreNavigation.StoreName : null,
                    Status = t.InventoryTransferStatus != null ? t.InventoryTransferStatus.TransferStatus : null,
                    RequestedAt = t.RequestedAt
                })
                .ToListAsync();

            return Ok(transfers);
        }

        // GET api/inventorytransfers/list-for-current-store
        // Returns paged inventory transfers for the authenticated user's store.
        // Optional filters:
        // - flow = "in" | "out" (relative to resolved store)
        // - status = status name (case-insensitive)
        // - page (1-based), pageSize
        // - for org admins: optional storeId to view a particular store in the org
        [Authorize]
        [HttpGet("list-for-current-store")]
        public async Task<ActionResult> ListForCurrentStore(
            [FromQuery] string? flow = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] int? storeId = null)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return Ok(new { items = Array.Empty<InventoryTransferListDto>(), totalCount = 0 });

            // Determine whether caller may request org-wide data
            var isOrgAdmin = User.IsInRole("Organization Admin") || User.IsInRole("Application Admin");

            // If the caller is not org admin, resolve store from user
            int? resolvedStoreId = null;
            if (!isOrgAdmin)
            {
                if (!domainUser.StoreId.HasValue) return Ok(new { items = Array.Empty<InventoryTransferListDto>(), totalCount = 0 });
                resolvedStoreId = domainUser.StoreId.Value;
            }
            else
            {
                // org admin may optionally pass a storeId to focus the listing on a single store
                if (storeId.HasValue)
                {
                    resolvedStoreId = storeId.Value;
                }
            }

            // Build base query with necessary includes
            var q = _context.InventoryTransfers
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .Include(t => t.InventoryTransferStatus)
                .Include(t => t.Driver)
                .Include(t => t.RequestedByNavigation)
                .AsQueryable();

            // Scoping:
            if (isOrgAdmin && !resolvedStoreId.HasValue)
            {
                // organization-level: restrict to transfers where either store belongs to the user's organization
                if (!domainUser.OrgId.HasValue) return Ok(new { items = Array.Empty<InventoryTransferListDto>(), totalCount = 0 });
                var orgId = domainUser.OrgId.Value;
                q = q.Where(t =>
                    (t.FromStoreNavigation != null && t.FromStoreNavigation.OrgId == orgId)
                    || (t.ToStoreNavigation != null && t.ToStoreNavigation.OrgId == orgId)
                );
            }
            else
            {
                // store-level: only transfers that involve the resolved store
                var sId = resolvedStoreId!.Value;
                q = q.Where(t => t.FromStore == sId || t.ToStore == sId);
            }

            // Flow filter (in / out) - only applies when resolvedStoreId is present
            if (!string.IsNullOrWhiteSpace(flow) && resolvedStoreId.HasValue)
            {
                var fl = flow.Trim().ToLowerInvariant();
                if (fl == "in")
                {
                    q = q.Where(t => t.ToStore == resolvedStoreId.Value);
                }
                else if (fl == "out")
                {
                    q = q.Where(t => t.FromStore == resolvedStoreId.Value);
                }
            }

            // Status filter
            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim().ToLowerInvariant();
                q = q.Where(t => t.InventoryTransferStatus != null && t.InventoryTransferStatus.TransferStatus.ToLower() == st);
            }

            // total count before paging
            var totalCount = await q.CountAsync();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var skip = (page - 1) * pageSize;

            var transfers = await q
                .OrderByDescending(t => t.RequestedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            // Project to DTO with computed fields
            var list = transfers.Select(t =>
            {
                var dto = new InventoryTransferListDto
                {
                    TransferId = t.InventoryTransferId,
                    Status = t.InventoryTransferStatus?.TransferStatus,
                    RequestedAt = t.RequestedAt,
                    Requester = t.RequestedByNavigation != null ? (t.RequestedByNavigation.UserFirstname + " " + t.RequestedByNavigation.UserLastname).Trim() : null,
                    DriverName = t.Driver != null ? t.Driver.DriverName : "Not assigned"
                };

                if (resolvedStoreId.HasValue)
                {
                    var sId = resolvedStoreId.Value;
                    if (t.FromStore == sId && t.ToStore != sId)
                    {
                        dto.InOut = "Out";
                        dto.StoreInvolved = t.ToStoreNavigation?.StoreName;
                    }
                    else if (t.ToStore == sId && t.FromStore != sId)
                    {
                        dto.InOut = "In";
                        dto.StoreInvolved = t.FromStoreNavigation?.StoreName;
                    }
                    else
                    {
                        // both sides equal (unlikely) or neither (organization-level without focused store)
                        dto.InOut = "N/A";
                        dto.StoreInvolved = $"{t.FromStoreNavigation?.StoreName} → {t.ToStoreNavigation?.StoreName}";
                    }
                }
                else
                {
                    // organization-level without focused store: show descriptive pairing
                    dto.InOut = "N/A";
                    dto.StoreInvolved = $"{t.FromStoreNavigation?.StoreName} → {t.ToStoreNavigation?.StoreName}";
                }

                return dto;
            }).ToList();

            return Ok(new { items = list, totalCount });
        }

        // GET api/inventorytransfers/statuses
        // Returns distinct transfer status names for populating client-side filters.
        [HttpGet("statuses")]
        public async Task<ActionResult<IEnumerable<string>>> GetStatuses()
        {
            try
            {
                var statuses = await _context.InventoryTransferStatuses
                    .Where(s => s.TransferStatus != null)
                    .Select(s => s.TransferStatus!)
                    .Distinct()
                    .OrderBy(s => s)
                    .ToListAsync();

                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load transfer statuses");
                return StatusCode(500, "Failed to load transfer statuses");
            }
        }
    }
}