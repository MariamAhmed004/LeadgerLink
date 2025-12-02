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

            var storeId = await ResolveCurrentUserStoreIdAsync();
            if (!storeId.HasValue) return Ok(0);

            var count = await _inventoryRepo.CountLowStockItemsByStoreAsync(storeId.Value);
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

            var storeId = await ResolveCurrentUserStoreIdAsync();
            if (!storeId.HasValue)
            {
                return Ok(new { items = Array.Empty<InventoryItemListDto>(), suppliers = Array.Empty<object>(), categories = Array.Empty<object>(), totalCount = 0 });
            }

            try
            {
                var (items, totalCount) = await _inventoryRepo.GetPagedForStoreAsync(storeId.Value, stockLevel, supplierId, categoryId, page, pageSize);
                var suppliers = await _inventoryRepo.GetSuppliersForStoreAsync(storeId.Value);
                var categories = await _inventoryRepo.GetCategoriesForStoreAsync(storeId.Value);

                return Ok(new { items, suppliers, categories, totalCount });
            }
            catch (Exception ex)
            {
                // preserve previous behavior: return 500 on unexpected failure
                Console.Error.WriteLine(ex);
                return StatusCode(500, "Failed to load inventory items");
            }
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
                Console.Error.WriteLine(ex);
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
                var (units, vatCategories) = await _inventoryRepo.GetLookupsAsync(null);
                return Ok(new { units, vatCategories });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, "Failed to load lookups");
            }
        }

        // Helper: resolve current user's store id (null when not available)
        private async Task<int?> ResolveCurrentUserStoreIdAsync()
        {
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return null;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            return user?.StoreId;
        }
    }
}