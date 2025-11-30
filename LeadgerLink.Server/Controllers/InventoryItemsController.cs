using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos;

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

        // GET api/inventoryitems/list-for-current-store
        // Returns paged inventory items for the authenticated user's store.
        // Optional filters: stockLevel = inStock|lowStock|outOfStock, supplierId, categoryId
        // Paging: page (1-based), pageSize
        [Authorize]
        [HttpGet("list-for-current-store")]
        public async Task<ActionResult> ListForCurrentStore(
            [FromQuery] string stockLevel = "",
            [FromQuery] int? supplierId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue) return Ok(new { items = Array.Empty<InventoryItemListDto>(), suppliers = Array.Empty<object>(), categories = Array.Empty<object>(), totalCount = 0 });

            var storeId = user.StoreId.Value;

            var q = _context.InventoryItems
                .Include(ii => ii.Supplier)
                .Include(ii => ii.InventoryItemCategory)
                .Include(ii => ii.Unit)
                .Where(ii => ii.StoreId == storeId)
                .AsQueryable();

            // apply supplier filter
            if (supplierId.HasValue)
            {
                q = q.Where(ii => ii.SupplierId == supplierId.Value);
            }

            // apply category filter
            if (categoryId.HasValue)
            {
                q = q.Where(ii => ii.InventoryItemCategoryId == categoryId.Value);
            }

            // apply stock level filter
            if (!string.IsNullOrWhiteSpace(stockLevel))
            {
                var sl = stockLevel.Trim().ToLowerInvariant();
                if (sl == "instock" || sl == "inStock".ToLower())
                {
                    q = q.Where(ii => ii.Quantity > 0 && (!ii.MinimumQuantity.HasValue || ii.Quantity >= ii.MinimumQuantity.Value));
                }
                else if (sl == "lowstock" || sl == "lowStock".ToLower())
                {
                    q = q.Where(ii => ii.MinimumQuantity.HasValue && ii.Quantity < ii.MinimumQuantity.Value);
                }
                else if (sl == "outofstock" || sl == "outOfStock".ToLower())
                {
                    q = q.Where(ii => ii.Quantity <= 0);
                }
            }

            var totalCount = await q.CountAsync();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var skip = (page - 1) * pageSize;

            var items = await q
                .OrderByDescending(ii => ii.UpdatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(ii => new InventoryItemListDto
                {
                    InventoryItemId = ii.InventoryItemId,
                    InventoryItemName = ii.InventoryItemName,
                    CategoryId = ii.InventoryItemCategoryId,
                    CategoryName = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : null,
                    SupplierId = ii.SupplierId,
                    SupplierName = ii.Supplier != null ? ii.Supplier.SupplierName : null,
                    UnitName = ii.Unit != null ? ii.Unit.UnitName : null,
                    Quantity = ii.Quantity,
                    MinimumQuantity = ii.MinimumQuantity,
                    UpdatedAt = ii.UpdatedAt
                })
                .ToListAsync();

            // compute derived stock level for each DTO
            foreach (var it in items)
            {
                if (it.Quantity <= 0) it.StockLevel = "Out of Stock";
                else if (it.MinimumQuantity.HasValue && it.Quantity < it.MinimumQuantity.Value) it.StockLevel = "Low Stock";
                else it.StockLevel = "In Stock";
            }

            // build supplier and category options scoped to this store
            var suppliers = await _context.Suppliers
                .Where(s => s.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(s => new { id = s.SupplierId, name = s.SupplierName })
                .Distinct()
                .ToListAsync();

            var categories = await _context.InventoryItemCategories
                .Where(c => c.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName })
                .Distinct()
                .ToListAsync();

            return Ok(new { items, suppliers, categories, totalCount });
        }
    }
}