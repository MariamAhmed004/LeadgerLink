using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for inventory item operations.
    public class InventoryItemRepository : Repository<InventoryItem>, IInventoryItemRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Constructor requires DbContext.
        public InventoryItemRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Count low-stock items across all stores in an organization.
        public async Task<int> CountLowStockItemsByOrganizationAsync(int organizationId)
        {
            return await _context.InventoryItems
                .Include(ii => ii.Store)
                .Where(ii => ii.Store != null
                             && ii.Store.OrgId == organizationId
                             && ii.MinimumQuantity.HasValue
                             && ii.Quantity < ii.MinimumQuantity.Value)
                .CountAsync();
        }

        // Count low-stock items for a single store.
        public async Task<int> CountLowStockItemsByStoreAsync(int storeId)
        {
            return await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId
                             && ii.MinimumQuantity.HasValue
                             && ii.Quantity < ii.MinimumQuantity.Value)
                .CountAsync();
        }

        // Inventory levels grouped by category for a store.
        public async Task<IEnumerable<InventoryCategoryLevelDto>> GetInventoryLevelByCategoryAsync(int storeId)
        {
            var query = await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId)
                .GroupBy(ii => new { ii.InventoryItemCategoryId, CategoryName = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : null })
                .Select(g => new InventoryCategoryLevelDto
                {
                    CategoryId = g.Key.InventoryItemCategoryId,
                    CategoryName = g.Key.CategoryName,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalValue = g.Sum(x => (x.Quantity * x.CostPerUnit))
                })
                .ToListAsync();

            return query;
        }

        // Inventory levels grouped by category for an organization.
        public async Task<IEnumerable<InventoryCategoryLevelDto>> GetInventoryLevelByCategoryForOrganizationAsync(int organizationId)
        {
            var query = await _context.InventoryItems
                .Include(ii => ii.Store)
                .Where(ii => ii.Store != null && ii.Store.OrgId == organizationId)
                .GroupBy(ii => new { ii.InventoryItemCategoryId, CategoryName = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : null })
                .Select(g => new InventoryCategoryLevelDto
                {
                    CategoryId = g.Key.InventoryItemCategoryId,
                    CategoryName = g.Key.CategoryName,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalValue = g.Sum(x => (x.Quantity * x.CostPerUnit))
                })
                .ToListAsync();

            return query;
        }

        // Total monetary value of inventory for an organization.
        public async Task<decimal> GetInventoryMonetaryValueByOrganizationAsync(int organizationId)
        {
            var sum = await _context.InventoryItems
                .Include(ii => ii.Store)
                .Where(ii => ii.Store != null && ii.Store.OrgId == organizationId)
                .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit));

            return sum ?? 0m;
        }

        // Total monetary value of inventory for a store.
        public async Task<decimal> GetInventoryMonetaryValueByStoreAsync(int storeId)
        {
            var sum = await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId)
                .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit));

            return sum ?? 0m;
        }

        // Alias - same as monetary value for organization.
        public Task<decimal> GetInventoryValueByOrganizationAsync(int organizationId)
            => GetInventoryMonetaryValueByOrganizationAsync(organizationId);

        // Alias - same as monetary value for store.
        public Task<decimal> GetInventoryValueByStoreAsync(int storeId)
            => GetInventoryMonetaryValueByStoreAsync(storeId);

        // Get all inventory items for a store.
        public async Task<IEnumerable<InventoryItem>> GetItemsByStoreAsync(int storeId)
        {
            return await _context.InventoryItems
                .Include(ii => ii.InventoryItemCategory)
                .Include(ii => ii.Unit)
                .Include(ii => ii.Supplier)
                .Where(ii => ii.StoreId == storeId)
                .ToListAsync();
        }

        // Get low-stock items for a store.
        public async Task<IEnumerable<InventoryItem>> GetLowStockItemsByStoreAsync(int storeId)
        {
            return await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId
                             && ii.MinimumQuantity.HasValue
                             && ii.Quantity < ii.MinimumQuantity.Value)
                .ToListAsync();
        }

        // Get most utilized inventory item for a store (based on sale quantities).
        public async Task<InventoryItem> GetMostUtilizedItemByStoreAsync(int storeId)
        {
            var top = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.StoreId == storeId && si.Product != null && si.Product.InventoryItemId != null)
                .GroupBy(si => si.Product!.InventoryItemId)
                .Select(g => new { InventoryItemId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .FirstOrDefaultAsync();

            if (top == null || top.InventoryItemId == null) return null!;

            return await _context.InventoryItems.FindAsync(top.InventoryItemId.Value);
        }

        // Mark an item as "on sale" (implemented as updating UpdatedAt; adjust when boolean flag exists).
        public async Task SetItemOnSaleAsync(int itemId)
        {
            var item = await _context.InventoryItems.FindAsync(itemId);
            if (item == null) return;

            item.UpdatedAt = DateTime.UtcNow;
            _context.InventoryItems.Update(item);
            await _context.SaveChangesAsync();
        }

        // Get an inventory item including common relations so controllers can return a detailed DTO.
        public async Task<InventoryItem?> GetWithRelationsAsync(int inventoryItemId)
        {
            return await _context.InventoryItems
                .Include(ii => ii.Supplier)
                .Include(ii => ii.Unit)
                .Include(ii => ii.InventoryItemCategory)
                .Include(ii => ii.Store)
                .Include(ii => ii.User)
                .Include(ii => ii.Products) // include related products to compute counts if needed
                .FirstOrDefaultAsync(ii => ii.InventoryItemId == inventoryItemId);
        }

        // -------------------------
        // New methods moved from controller
        // -------------------------

        // Paged listing for a store with filtering & total count
        public async Task<(IEnumerable<InventoryItemListDto> Items, int TotalCount)> GetPagedForStoreAsync(
            int storeId,
            string stockLevel,
            int? supplierId,
            int? categoryId,
            int page,
            int pageSize)
        {
            var q = _context.InventoryItems
                .Include(ii => ii.Supplier)
                .Include(ii => ii.InventoryItemCategory)
                .Include(ii => ii.Unit)
                .Where(ii => ii.StoreId == storeId)
                .AsQueryable();

            if (supplierId.HasValue) q = q.Where(ii => ii.SupplierId == supplierId.Value);
            if (categoryId.HasValue) q = q.Where(ii => ii.InventoryItemCategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(stockLevel))
            {
                var sl = stockLevel.Trim().ToLowerInvariant();
                if (sl == "instock") q = q.Where(ii => ii.Quantity > 0 && (!ii.MinimumQuantity.HasValue || ii.Quantity >= ii.MinimumQuantity.Value));
                else if (sl == "lowstock") q = q.Where(ii => ii.MinimumQuantity.HasValue && ii.Quantity < ii.MinimumQuantity.Value);
                else if (sl == "outofstock") q = q.Where(ii => ii.Quantity <= 0);
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
                    UpdatedAt = ii.UpdatedAt,
                    Description = ii.Description,
                    CostPerUnit = ii.CostPerUnit,
                    ImageUrl = ii.InventoryItemImage != null && ii.InventoryItemImage.Length > 0
                                   ? $"data:image;base64,{Convert.ToBase64String(ii.InventoryItemImage)}"
                                   : null
                })
                .ToListAsync();

            // compute derived stock level for each DTO
            foreach (var it in items)
            {
                if (it.Quantity <= 0) it.StockLevel = "Out of Stock";
                else if (it.MinimumQuantity.HasValue && it.Quantity < it.MinimumQuantity.Value) it.StockLevel = "Low Stock";
                else it.StockLevel = "In Stock";
            }

            return (items, totalCount);
        }

        // Suppliers for store (projection)
        public async Task<IEnumerable<object>> GetSuppliersForStoreAsync(int storeId)
        {
            var suppliers = await _context.Suppliers
                .Where(s => s.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(s => new { id = s.SupplierId, name = s.SupplierName })
                .Distinct()
                .ToListAsync();

            return suppliers;
        }

        // Categories for store (projection)
        public async Task<IEnumerable<object>> GetCategoriesForStoreAsync(int storeId)
        {
            var categories = await _context.InventoryItemCategories
                .Where(c => c.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName })
                .Distinct()
                .ToListAsync();

            return categories;
        }

        // Global lookups (units + vat categories). Keep simple and return all saved values.
        public async Task<(IEnumerable<object> Units, IEnumerable<object> VatCategories)> GetLookupsAsync(int? storeId = null)
        {
            var units = await _context.Units
                .Select(u => new { unitId = u.UnitId, unitName = u.UnitName })
                .ToListAsync();

            var vatCategories = await _context.VatCategories
                .Select(v => new { id = v.VatCategoryId, label = v.VatCategoryName, rate = v.VatRate })
                .ToListAsync();

            return (units, vatCategories);
        }

        // Add this method inside the InventoryItemRepository class (use existing _context).
        // Requires: using LeadgerLink.Server.Dtos; using Microsoft.EntityFrameworkCore;
        public async Task<InventoryItemDetailDto?> GetDetailByIdAsync(int inventoryItemId)
        {
            return await _context.InventoryItems
                .Where(i => i.InventoryItemId == inventoryItemId)
                .Select(i => new InventoryItemDetailDto
                {
                    InventoryItemId = i.InventoryItemId,
                    InventoryItemName = i.InventoryItemName,
                    Description = i.Description,
                    Quantity = i.Quantity,
                    MinimumQuantity = i.MinimumQuantity,
                    CostPerUnit = i.CostPerUnit,
                    UnitId = i.UnitId,
                    UnitName = i.Unit != null ? i.Unit.UnitName : null,
                    SupplierId = i.SupplierId,
                    SupplierName = i.Supplier != null ? i.Supplier.SupplierName : null,
                    SupplierContact = i.Supplier != null ? i.Supplier.ContactMethod : null,
                    CategoryId = i.InventoryItemCategoryId,
                    CategoryName = i.InventoryItemCategory != null ? i.InventoryItemCategory.InventoryItemCategoryName : null,
                    StoreId = i.StoreId,
                    StoreName = i.Store != null ? i.Store.StoreName : null,
                    StockLevel = (i.Quantity <= 0) ? "Out of Stock" :
                                 (i.MinimumQuantity.HasValue && i.Quantity < i.MinimumQuantity.Value) ? "Low Stock" :
                                 "In Stock",
                    ImageDataUrl = i.InventoryItemImage != null && i.InventoryItemImage.Length > 0
                                   ? $"data:image;base64,{Convert.ToBase64String(i.InventoryItemImage)}"
                                   : null,
                    CreatedByName = i.User != null ? ((i.User.UserFirstname ?? "") + " " + (i.User.UserLastname ?? "")).Trim() : null,
                    CreatedAt = i.CreatedAt,
                    UpdatedAt = i.UpdatedAt,
                    RelatedProductId = i.Products != null
                        ? i.Products
                            .Where(p => p.InventoryItemId == i.InventoryItemId)
                            .Select(p => (int?)p.ProductId)
                            .FirstOrDefault()
                        : null
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }
    }
}