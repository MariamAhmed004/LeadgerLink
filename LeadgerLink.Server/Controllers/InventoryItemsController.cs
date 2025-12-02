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

        // GET api/inventoryitems/{id}
        // Returns detailed inventory item info including image as a data URL when binary image is stored.
        [Authorize]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<InventoryItemDetailDto>> GetById(int id)
        {
            try
            {
                var item = await _inventoryRepo.GetWithRelationsAsync(id);
                if (item == null) return NotFound();

                var dto = new InventoryItemDetailDto
                {
                    InventoryItemId = item.InventoryItemId,
                    InventoryItemName = item.InventoryItemName,
                    Description = item.Description,
                    Quantity = item.Quantity,
                    MinimumQuantity = item.MinimumQuantity,
                    CostPerUnit = item.CostPerUnit,
                    UnitName = item.Unit != null ? item.Unit.UnitName : null,
                    SupplierId = item.SupplierId,
                    SupplierName = item.Supplier != null ? item.Supplier.SupplierName : null,
                    CategoryId = item.InventoryItemCategoryId,
                    CategoryName = item.InventoryItemCategory != null ? item.InventoryItemCategory.InventoryItemCategoryName : null,
                    StoreId = item.StoreId,
                    StoreName = item.Store != null ? item.Store.StoreName : null,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt,
                    CreatedByName = item.User != null ? (item.User.UserFirstname + " " + item.User.UserLastname).Trim() : null,
                    RelatedProductsCount = item.Products?.Count ?? 0
                };

                // compute stock level
                if (dto.Quantity <= 0) dto.StockLevel = "Out of Stock";
                else if (dto.MinimumQuantity.HasValue && dto.Quantity < dto.MinimumQuantity.Value) dto.StockLevel = "Low Stock";
                else dto.StockLevel = "In Stock";

                // If image is stored as binary in InventoryItemImage, return as data URL.
                if (item.InventoryItemImage != null && item.InventoryItemImage.Length > 0)
                {
                    var b64 = Convert.ToBase64String(item.InventoryItemImage);
                    // No reliable MIME type stored — use image/* to let browser detect or client render.
                    dto.ImageDataUrl = $"data:image/*;base64,{b64}";
                }
                else
                {
                    dto.ImageDataUrl = null;
                }

                return Ok(dto);
            }
            catch (Exception ex)
            {
                // keep logging consistent with other controllers (if logger available, could log)
                return StatusCode(500, "Failed to load inventory item");
            }
        }

        // GET api/inventoryitems/lookups
        // Returns lookup lists that don't have dedicated controllers (Units, VAT categories)
        // scoped where applicable to the current user's store.
        [Authorize]
        [HttpGet("lookups")]
        public async Task<ActionResult> GetLookupsForCurrentStore()
        {
            try
            {
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (user == null || !user.StoreId.HasValue)
                {
                    // Return global lookups (empty/available) when store is not resolved
                    var allUnits = await _context.Units
                        .Select(u => new { unitId = u.UnitId, unitName = u.UnitName })
                        .ToListAsync();

                    var allVat = await _context.VatCategories
                        .Select(v => new { id = v.VatCategoryId, label = v.VatCategoryName, rate = v.VatRate })
                        .ToListAsync();

                    return Ok(new { units = allUnits, vatCategories = allVat });
                }

                var storeId = user.StoreId.Value;

                // Units used by this store (units referenced by inventory items in this store).
                var units = await _context.Units
                    .Where(u => u.InventoryItems.Any(ii => ii.StoreId == storeId))
                    .Select(u => new { unitId = u.UnitId, unitName = u.UnitName })
                    .Distinct()
                    .ToListAsync();

                // If no units specifically used by the store, return all units as fallback.
                if (units.Count == 0)
                {
                    units = await _context.Units
                        .Select(u => new { unitId = u.UnitId, unitName = u.UnitName })
                        .ToListAsync();
                }

                // VAT categories are global; return all.
                var vatCategories = await _context.VatCategories
                    .Select(v => new { id = v.VatCategoryId, label = v.VatCategoryName, rate = v.VatRate })
                    .ToListAsync();

                return Ok(new { units, vatCategories });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, "Failed to load lookups");
            }
        }
    }
}