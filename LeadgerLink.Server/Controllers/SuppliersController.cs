using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/suppliers")]
    public class SuppliersController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;

        public SuppliersController(LedgerLinkDbContext context)
        {
            _context = context;
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

                // Return suppliers that are either explicitly assigned to the store
                // or that have inventory items in that store (keeps parity with list-for-current-store)
                // Include contactMethod and supplierName so client can show contact details and use expected keys.
                var suppliers = await _context.Suppliers
                    .Where(s => s.StoreId == resolvedStoreId
                                || s.InventoryItems.Any(ii => ii.StoreId == resolvedStoreId))
                    .Select(s => new
                    {
                        supplierId = s.SupplierId,
                        supplierName = s.SupplierName,
                        contactMethod = s.ContactMethod
                    })
                    .Distinct()
                    .ToListAsync();

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