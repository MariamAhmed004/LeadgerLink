using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using LeadgerLink.Server.Services;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/suppliers")]
    public class SuppliersController : ControllerBase
    {
        // Repository for managing supplier-related data
        private readonly IRepository<Supplier> _supplierRepo;

        // Repository for managing user-related data
        private readonly IUserRepository _userRepository;

        // Audit logger for logging exceptions
        private readonly IAuditLogger _auditLogger;

        // Constructor to initialize dependencies
        public SuppliersController(
            IRepository<Supplier> supplierRepo,
            IUserRepository userRepository,
            IAuditLogger auditLogger)
        {
            _supplierRepo = supplierRepo ?? throw new ArgumentNullException(nameof(supplierRepo));
            _userRepository = userRepository;
            _auditLogger = auditLogger;
        }

        // GET api/suppliers?storeId=5
        // Retrieves suppliers for the specified store or the authenticated user's store.
        [Authorize]
        [HttpGet]
        public async Task<ActionResult> GetSuppliersForStore([FromQuery] int? storeId = null)
        {
            try
            {
                // Resolve the store ID from the query parameter or user claims
                int? resolvedStoreId = storeId;
                if (!resolvedStoreId.HasValue)
                {
                    // Extract the user's email from claims
                    var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                                ?? User.Identity?.Name;
                    if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                    // Fetch the user from the repository
                    var user = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                    if (user == null || !user.StoreId.HasValue) return Ok(new object[0]);

                    resolvedStoreId = user.StoreId.Value;
                }

                // Fetch suppliers for the resolved store
                var suppliersEntities = await _supplierRepo.GetWhereAsync(
                    s => s.StoreId == resolvedStoreId
                         || s.InventoryItems.Any(ii => ii.StoreId == resolvedStoreId)
                );

                // Map suppliers to lightweight DTOs
                var suppliers = suppliersEntities
                    .Select(s => new
                    {
                        supplierId = s.SupplierId,
                        supplierName = s.SupplierName,
                        contactMethod = s.ContactMethod
                    })
                    .Distinct()
                    .ToList();

                // Return the result
                return Ok(suppliers);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                Console.Error.WriteLine(ex); // Replace with proper logging
                try { await _auditLogger.LogExceptionAsync("Failed to load suppliers", ex.StackTrace); } catch { }
                return StatusCode(500, $"Failed to load suppliers: {ex.Message}");
            }
        }
    }
}