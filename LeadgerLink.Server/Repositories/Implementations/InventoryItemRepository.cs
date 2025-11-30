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
    }
}