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
    }
}