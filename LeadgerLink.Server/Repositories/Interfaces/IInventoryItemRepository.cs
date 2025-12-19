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

        // Get an inventory item with related entities (supplier, unit, category, store, user)
        Task<InventoryItem?> GetWithRelationsAsync(int inventoryItemId);

        // --- New repository operations to move controller logic into repository ---
        // Returns paged list and total count for a store using optional filters.
        Task<(IEnumerable<InventoryItemListDto> Items, int TotalCount)> GetPagedForStoreAsync(
            int storeId,
            string stockLevel,
            int? supplierId,
            int? categoryId,
            int page,
            int pageSize);

        // Suppliers & categories used by store (for select lists)
        Task<IEnumerable<object>> GetSuppliersForStoreAsync(int storeId);
        Task<IEnumerable<object>> GetCategoriesForStoreAsync(int storeId);

        // Return global lookups (units, vat categories).
        Task<(IEnumerable<object> Units, IEnumerable<object> VatCategories)> GetLookupsAsync(int? storeId = null);

        // Return a DTO shaped for API consumption (avoids serializing EF navigation cycles)
        Task<InventoryItemDetailDto?> GetDetailByIdAsync(int inventoryItemId);

        // Organization-wide paged listing with filtering & total count
        Task<(IEnumerable<InventoryItemListDto> Items, int TotalCount)> GetPagedForOrganizationAsync(
            int organizationId,
            string stockLevel,
            int? supplierId,
            int? categoryId,
            int page,
            int pageSize);

        // Suppliers for organization (projection)
        Task<IEnumerable<object>> GetSuppliersForOrganizationAsync(int organizationId);
        // Categories for organization (projection)
        Task<IEnumerable<object>> GetCategoriesForOrganizationAsync(int organizationId);

        Task<(bool Success, List<int> InsufficientInventoryItems, List<int> InsufficientRecipeIngredients)> DeductQuantitiesAsync(
            List<(int InventoryItemId, decimal Quantity)> inventoryItems,
            List<(int RecipeId, decimal Quantity)> recipes);

        // Generates an Excel template for bulk uploading inventory items.
        byte[] GenerateInventoryTemplate();

        // Uploads inventory items from a provided file stream for a specific store.
        Task<(bool Success, string Message)> UploadInventoryItemsAsync(Stream fileStream, int storeId);
    }
}