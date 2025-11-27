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
    [Route("api/inventoryitems")]
    public class InventoryItemsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IInventoryItemRepository _inventoryRepo;

        public InventoryItemsController(LedgerLinkDbContext context, IInventoryItemRepository inventoryRepo)
        {
            _context = context;
            _inventoryRepo = inventoryRepo;
        }

        // GET api/inventoryitems/lowstock/current-store/count
        // Returns number of inventory items for the authenticated user's store whose quantity < minimum threshold.
        [Authorize]
        [HttpGet("lowstock/current-store/count")]
        public async Task<ActionResult<int>> CountLowStockForCurrentStore()
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue) return Ok(0);

            var storeId = user.StoreId.Value;
            var count = await _inventoryRepo.CountLowStockItemsByStoreAsync(storeId);
            return Ok(count);
        }
    }
}