using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for inventory item operations.
    public interface IInventoryItemRepository : IRepository<InventoryItem>
    {
        // Count low-stock items for an organization.
        Task<int> CountLowStockItemsByOrganizationAsync(int organizationId);

        // Count low-stock items for a store.
        Task<int> CountLowStockItemsByStoreAsync(int storeId);

        // Get inventory levels grouped by category for a store.
        Task<IEnumerable<InventoryCategoryLevelDto>> GetInventoryLevelByCategoryAsync(int storeId);

        // Get inventory levels grouped by category for an organization.
        Task<IEnumerable<InventoryCategoryLevelDto>> GetInventoryLevelByCategoryForOrganizationAsync(int organizationId);

        // Get total monetary value of inventory for an organization.
        Task<decimal> GetInventoryMonetaryValueByOrganizationAsync(int organizationId);

        // Get total monetary value of inventory for a store.
        Task<decimal> GetInventoryMonetaryValueByStoreAsync(int storeId);

        // Get inventory value for an organization.
        Task<decimal> GetInventoryValueByOrganizationAsync(int organizationId);

        // Get inventory value for a store.
        Task<decimal> GetInventoryValueByStoreAsync(int storeId);

        // Get all inventory items for a store.
        Task<IEnumerable<InventoryItem>> GetItemsByStoreAsync(int storeId);

        // Get low-stock items for a store.
        Task<IEnumerable<InventoryItem>> GetLowStockItemsByStoreAsync(int storeId);

        // Get the most utilized inventory item for a store.
        Task<InventoryItem> GetMostUtilizedItemByStoreAsync(int storeId);

        // Mark an item as on sale.
        Task SetItemOnSaleAsync(int itemId);
    }
}