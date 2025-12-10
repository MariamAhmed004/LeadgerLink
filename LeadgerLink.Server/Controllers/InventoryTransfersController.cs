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

            try
            {
                var transfers = await _repository.GetLatestForStoreAsync(storeId, pageSize);
                return Ok(transfers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load latest inventory transfers");
                return StatusCode(500, "Failed to load latest inventory transfers");
            }
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

            try
            {
                var orgId = domainUser.OrgId;
                var (items, totalCount) = await _repository.GetPagedForCurrentStoreAsync(resolvedStoreId, isOrgAdmin, orgId, flow, status, page, pageSize);
                return Ok(new { items, totalCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load inventory transfers");
                return StatusCode(500, "Failed to load inventory transfers");
            }
        }

        // GET api/inventorytransfers/statuses
        // Returns distinct transfer status names for populating client-side filters.
        [HttpGet("statuses")]
        public async Task<ActionResult<IEnumerable<string>>> GetStatuses()
        {
            try
            {
                var statuses = await _repository.GetStatusesAsync();
                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load transfer statuses");
                return StatusCode(500, "Failed to load transfer statuses");
            }
        }

        // GET api/inventorytransfers/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            try
            {
                var dto = await _repository.GetDetailByIdAsync(id);
                if (dto == null) return NotFound();
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load inventory transfer {Id}", id);
                return StatusCode(500, "Failed to load inventory transfer");
            }
        }

        // POST api/inventorytransfers
        // Creates a new transfer request. Status is provided by client (e.g., Draft or Pending).
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> CreateTransfer()
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.StoreId.HasValue) return BadRequest("Unable to resolve user's store.");

            var opts = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            CreateInventoryTransferDto? dto;
            try
            {
                using var sr = new System.IO.StreamReader(Request.Body);
                var body = await sr.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<CreateInventoryTransferDto>(body, opts);
            }
            catch
            {
                return BadRequest("Invalid request body.");
            }

            if (dto == null) return BadRequest("Missing payload.");
            if (dto.Items == null || dto.Items.Length == 0) return BadRequest("Select at least one item.");

            var requesterId = dto.RequesterStoreId ?? domainUser.StoreId!.Value; // destination store (requester)
            var fromId = dto.FromStoreId; // source store
            if (!fromId.HasValue) return BadRequest("Request From store must be selected.");

            var parsedDate = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(dto.Date) && DateTime.TryParse(dto.Date, out var d)) parsedDate = d;

            var statusValue = !string.IsNullOrWhiteSpace(dto.Status) ? dto.Status!.Trim() : "draft";
            var statusLower = statusValue.ToLowerInvariant();
            InventoryTransferStatus? Status = await _context.InventoryTransferStatuses
                .FirstOrDefaultAsync(s => (s.TransferStatus != null ? s.TransferStatus.ToLower() : "") == statusLower);

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = new InventoryTransfer
                {
                    FromStore = fromId.Value,       // source store
                    ToStore = requesterId,          // destination store (requester)
                    RequestedAt = parsedDate,
                    InventoryTransferStatusId = Status != null ? Status.TransferStatusId : 1,
                    Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim(),
                    RequestedBy = domainUser.UserId
                };

                _context.InventoryTransfers.Add(transfer);
                await _context.SaveChangesAsync();

                foreach (var it in dto.Items)
                {
                    var qty = it.Quantity;
                    if (qty <= 0)
                    {
                        _logger.LogWarning("Skipping transfer item with non-positive quantity: {Item}", it);
                        continue;
                    }

                    if (it.RecipeId.HasValue)
                    {
                        var ti = new TransferItem
                        {
                            InventoryTransferId = transfer.InventoryTransferId,
                            RecipeId = it.RecipeId,
                            Quantity = qty,
                            IsRequested = true
                        };
                        _context.TransferItems.Add(ti);
                    }
                    else if (it.InventoryItemId.HasValue)
                    {
                        var ti = new TransferItem
                        {
                            InventoryTransferId = transfer.InventoryTransferId,
                            InventoryItemId = it.InventoryItemId,
                            Quantity = qty,
                            IsRequested = true
                        };
                        _context.TransferItems.Add(ti);
                    }
                    else
                    {
                        _logger.LogWarning("Skipping invalid transfer item (no ids): {Item}", it);
                    }
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = transfer.InventoryTransferId }, new { id = transfer.InventoryTransferId });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Failed to create inventory transfer");
                return StatusCode(500, "Failed to create inventory transfer.");
            }
        }
    }
}