using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    // Route sits under /api/inventorytransfers to keep related endpoints together.
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/inventorytransfers")]
    public class InventoryTransferDriversController : ControllerBase
    {
        // Repository for accessing driver data
        private readonly IRepository<Driver> _driverRepository;

        // Logger for logging messages and errors
        private readonly ILogger<InventoryTransferDriversController> _logger;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Repository for user-specific queries
        private readonly IUserRepository _userRepository;

        // Constructor to initialize dependencies
        public InventoryTransferDriversController(
            IRepository<Driver> driverRepository,
            ILogger<InventoryTransferDriversController> logger,
            IAuditContext auditContext,
            IUserRepository userRepository)
        {
            _driverRepository = driverRepository ?? throw new ArgumentNullException(nameof(driverRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _auditContext = auditContext ?? throw new ArgumentNullException(nameof(auditContext));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        }

        // GET: api/inventorytransfers/drivers/by-store/{storeId}
        // Fetches drivers for a specific store and returns their ID, name, and email.
        [HttpGet("drivers/by-store/{storeId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetDriversByStore(int storeId)
        {
            await SetAuditContextUserId();

            try
            {
                // Fetch all drivers from the repository
                var all = await _driverRepository.GetAllAsync();

                // Filter drivers by storeId and project the required fields
                var filtered = (all ?? Array.Empty<Driver>())
                    .Where(d => d.StoreId.HasValue && d.StoreId.Value == storeId)
                    .Select(d => new
                    {
                        driverId = d.DriverId,
                        driverName = d.DriverName,
                        driverEmail = d.DriverEmail,
                        storeId = d.StoreId
                    })
                    .ToList();

                // Return the filtered drivers
                return Ok(filtered);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load drivers for store {StoreId}", storeId);
                return StatusCode(500, "Failed to load drivers");
            }
        }

        // Resolves the user ID from the current user's claims.
        private async Task<int?> ResolveUserIdAsync()
        {
            // Extract the email from the user's claims or identity
            var email = User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User?.Identity?.Name;

            // Return null if the email is missing or invalid
            if (string.IsNullOrWhiteSpace(email)) return null;

            // Fetch the user from the repository using the email
            var user = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            // Return the user ID if the user exists, otherwise return null
            return user?.UserId;
        }

        // Sets the audit context user ID based on the current user's claims.
        private async Task SetAuditContextUserId()
        {
            // Resolve the user ID and set it in the audit context
            _auditContext.UserId = await ResolveUserIdAsync();
        }
    }
}