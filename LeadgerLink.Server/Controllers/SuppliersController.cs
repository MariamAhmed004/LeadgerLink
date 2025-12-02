using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/suppliers")]
    public class SuppliersController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IRepository<Supplier> _supplierRepo;

        public SuppliersController(LedgerLinkDbContext context, IRepository<Supplier> supplierRepo)
        {
            _context = context;
            _supplierRepo = supplierRepo ?? throw new ArgumentNullException(nameof(supplierRepo));
        }

        // GET api/suppliers?storeId=5
        // If storeId not provided, resolve the current authenticated user's store and return suppliers for it.
        [Authorize]
        [HttpGet]
        public async Task<ActionResult> GetSuppliersForStore()
        {
            try
            {
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (user == null || !user.StoreId.HasValue) return Ok(new object[0]);

                int resolvedStoreId = user.StoreId.Value;

                // Use generic repository to fetch suppliers for the resolved store.
                var suppliersEntities = await _supplierRepo.GetWhereAsync(
                    s => s.StoreId == resolvedStoreId
                         || s.InventoryItems.Any(ii => ii.StoreId == resolvedStoreId)
                );

                var suppliers = suppliersEntities
                    .Select(s => new
                    {
                        supplierId = s.SupplierId,
                        supplierName = s.SupplierName,
                        contactMethod = s.ContactMethod
                    })
                    .Distinct()
                    .ToList();

                return Ok(suppliers);
            }
            catch (Exception ex)
            {
                // minimal server-side reporting; do not leak sensitive info in production
                Console.Error.WriteLine(ex);
                return StatusCode(500, $"Failed to load suppliers: {ex.Message}");
            }
        }
    }
}