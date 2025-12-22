using ClosedXML.Excel;
using LeadgerLink.Server.Dtos.InventoryItemDtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for inventory item operations.
    public class InventoryItemRepository : Repository<InventoryItem>, IInventoryItemRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly INotificationRepository _notificationRepository;

        // Constructor requires DbContext.
        public InventoryItemRepository(LedgerLinkDbContext context, INotificationRepository notificationRepository) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _notificationRepository = notificationRepository;
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

        // Organization-wide paged listing with filtering & total count
        public async Task<(IEnumerable<InventoryItemListDto> Items, int TotalCount)> GetPagedForOrganizationAsync(
            int organizationId,
            string stockLevel,
            int? supplierId,
            int? categoryId,
            int page,
            int pageSize)
        {
            var storeIds = await _context.Stores
                .Where(s => s.OrgId == organizationId)
                .Select(s => s.StoreId)
                .ToListAsync();

            if (storeIds.Count == 0)
                return (new List<InventoryItemListDto>(), 0);

            var q = _context.InventoryItems
                .Include(ii => ii.Supplier)
                .Include(ii => ii.InventoryItemCategory)
                .Include(ii => ii.Unit)
                .Where(ii => storeIds.Contains(ii.StoreId))
                .AsQueryable();

            if (supplierId.HasValue)
                q = q.Where(ii => ii.SupplierId == supplierId.Value);
            if (categoryId.HasValue)
                q = q.Where(ii => ii.InventoryItemCategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(stockLevel))
            {
                var sl = stockLevel.Trim().ToLowerInvariant();
                if (sl == "instock")
                    q = q.Where(ii => ii.Quantity > 0 && (!ii.MinimumQuantity.HasValue || ii.Quantity >= ii.MinimumQuantity.Value));
                else if (sl == "lowstock")
                    q = q.Where(ii => ii.MinimumQuantity.HasValue && ii.Quantity < ii.MinimumQuantity.Value);
                else if (sl == "outofstock")
                    q = q.Where(ii => ii.Quantity <= 0);
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
                    StoreName = ii.Store != null ? ii.Store.StoreName : null,
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

        public async Task<IEnumerable<object>> GetSuppliersForStoreAsync(int storeId)
        {
            var suppliers = await _context.Suppliers
                .Where(s => s.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(s => new { id = s.SupplierId, name = s.SupplierName })
                .Distinct()
                .ToListAsync();

            return suppliers;
        }

        public async Task<IEnumerable<object>> GetCategoriesForStoreAsync(int storeId)
        {
            var categories = await _context.InventoryItemCategories
                .Where(c => c.InventoryItems.Any(ii => ii.StoreId == storeId))
                .Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName })
                .Distinct()
                .ToListAsync();

            return categories;
        }

        public async Task<IEnumerable<object>> GetSuppliersForOrganizationAsync(int organizationId)
        {
            var storeIds = await _context.Stores
                .Where(s => s.OrgId == organizationId)
                .Select(s => s.StoreId)
                .ToListAsync();
            if (storeIds.Count == 0) return new List<object>();
            var suppliers = await _context.Suppliers
                .Where(s => s.StoreId != null && storeIds.Contains(s.StoreId.Value))
                .Select(s => new { id = s.SupplierId, name = s.SupplierName })
                .Distinct()
                .ToListAsync();
            return suppliers;
        }

        public async Task<IEnumerable<object>> GetCategoriesForOrganizationAsync(int organizationId)
        {
            var categories = await _context.InventoryItemCategories
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
        public async Task<InventoryItemDetailDto?> GetDetailByIdAsync(int inventoryItemId, int loggedInUserId)
        {
            // Fetch the inventory item details
            var inventoryItem = await _context.InventoryItems
                .Where(i => i.InventoryItemId == inventoryItemId)
                .Select(i => new
                {
                    i.StoreId,
                    Detail = new InventoryItemDetailDto
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
                    }
                })
                .FirstOrDefaultAsync();

            // If the inventory item does not exist, return null
            if (inventoryItem == null) return null;

            // Validate that the store's OrgId matches the logged-in user's OrgId
            var isValid = await ValidateOrgAssociationAsync(loggedInUserId, storeIds: new[] { inventoryItem.StoreId });
            if (!isValid)
            {
                throw new UnauthorizedAccessException("The inventory item's store does not belong to the same organization as the logged-in user.");
            }

            // Return the inventory item details
            return inventoryItem.Detail;
        }

        public async Task<(bool Success, List<int> InsufficientInventoryItems, List<int> InsufficientRecipeIngredients)> DeductQuantitiesAsync(
            List<(int InventoryItemId, decimal Quantity)> inventoryItems,
            List<(int RecipeId, decimal Quantity)> recipes)
        {
            var insufficientInventoryItems = new List<int>();
            var insufficientRecipeIngredients = new List<int>();

            // Deduct quantities for inventory items
            foreach (var (inventoryItemId, quantity) in inventoryItems)
            {
                var inventoryItem = await _context.InventoryItems
                    .Include(ii => ii.Store) // Include the store to fetch the store manager
                    .FirstOrDefaultAsync(ii => ii.InventoryItemId == inventoryItemId);

                if (inventoryItem == null)
                {
                    throw new InvalidOperationException($"Inventory item with ID {inventoryItemId} not found.");
                }

                if (inventoryItem.Quantity < quantity)
                {
                    // Insufficient stock, set quantity to zero and add to insufficient list
                    insufficientInventoryItems.Add(inventoryItemId);
                    inventoryItem.Quantity = 0;
                }
                else
                {
                    inventoryItem.Quantity -= quantity;
                }

                _context.InventoryItems.Update(inventoryItem);
            }

            // Deduct quantities for recipes
            foreach (var (recipeId, quantity) in recipes)
            {
                var recipe = await _context.Recipes
                    .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                    .FirstOrDefaultAsync(r => r.RecipeId == recipeId);

                if (recipe == null)
                {
                    throw new InvalidOperationException($"Recipe with ID {recipeId} not found.");
                }

                foreach (var recipeInventoryItem in recipe.RecipeInventoryItems)
                {
                    var ingredient = recipeInventoryItem.InventoryItem;
                    if (ingredient == null)
                    {
                        throw new InvalidOperationException($"Ingredient with ID {recipeInventoryItem.InventoryItemId} not found for recipe ID {recipeId}.");
                    }

                    var requiredQuantity = recipeInventoryItem.Quantity * quantity;
                    if (ingredient.Quantity < requiredQuantity)
                    {
                        // Insufficient stock, set quantity to zero and add to insufficient list
                        insufficientRecipeIngredients.Add(recipeInventoryItem.InventoryItemId);
                        ingredient.Quantity = 0;
                    }
                    else
                    {
                        ingredient.Quantity -= requiredQuantity;
                    }

                    _context.InventoryItems.Update(ingredient);
                }
            }

            // Save changes to the database
            await _context.SaveChangesAsync();

            // Step 1: Get low-stock items
            var lowStockItemIds = inventoryItems.Select(ii => ii.InventoryItemId).ToList();
            var lowStockItems = await GetLowStockItemsAsync(lowStockItemIds);

            // Step 2: Send notifications for low-stock items
            foreach (var (inventoryItemId, inventoryItemName) in lowStockItems)
            {
                var inventoryItem = await _context.InventoryItems
                    .Include(ii => ii.Store)
                    .FirstOrDefaultAsync(ii => ii.InventoryItemId == inventoryItemId);

                if (inventoryItem?.Store?.UserId != null)
                {
                    await _notificationRepository.SendNotificationAsync(
                        subject: "Low Stock Alert",
                        message: $"The inventory item '{inventoryItemName}' is low on stock.",
                        userId: inventoryItem.Store.UserId.Value, // Store manager's user ID
                        notificationTypeName: "low stock alert"// Static placeholder for notification type ID
                    );
                }
            }

            // Return success indicator and lists of insufficient items
            var success = !insufficientInventoryItems.Any() && !insufficientRecipeIngredients.Any();
            return (success, insufficientInventoryItems, insufficientRecipeIngredients);
        }

        public async Task<List<(int InventoryItemId, string InventoryItemName)>> GetLowStockItemsAsync(IEnumerable<int> inventoryItemIds)
        {
            // Fetch inventory items by IDs and check their quantities against their thresholds
            var lowStockItems = await _context.InventoryItems
                .Where(ii => inventoryItemIds.Contains(ii.InventoryItemId) &&
                             ii.MinimumQuantity.HasValue &&
                             ii.Quantity < ii.MinimumQuantity.Value)
                .Select(ii => new { ii.InventoryItemId, ii.InventoryItemName })
                .ToListAsync();

            // Return the list of tuples containing both ID and name
            return lowStockItems.Select(ii => (ii.InventoryItemId, ii.InventoryItemName)).ToList();
        }

        public byte[] GenerateInventoryTemplate()
        {
            // Fetch categories and units from the database
            var categories = _context.InventoryItemCategories
                .Select(c => c.InventoryItemCategoryName)
                .ToList();

            var units = _context.Units
                .Select(u => u.UnitName)
                .ToList();

            using (var workbook = new XLWorkbook())
            {
                // --- Data sheet ---
                var wsData = workbook.Worksheets.Add("Data");

                // Headers
                wsData.Cell(1, 1).Value = "Item Name";
                wsData.Cell(1, 2).Value = "Description";
                wsData.Cell(1, 3).Value = "Supplier";
                wsData.Cell(1, 4).Value = "Supplier Contact Method"; // New column
                wsData.Cell(1, 5).Value = "Category";
                wsData.Cell(1, 6).Value = "Unit";
                wsData.Cell(1, 7).Value = "Cost Per Unit";
                wsData.Cell(1, 8).Value = "Quantity";
                wsData.Cell(1, 9).Value = "Threshold";

                // Style headers
                var headerRange = wsData.Range(1, 1, 1, 9);
                headerRange.Style.Font.Bold = true;
                headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

                // Adjust column widths (3x wider)
                for (int col = 1; col <= 9; col++)
                {
                    wsData.Column(col).Width = wsData.Column(col).Width * 3;
                }

                // --- Lookup sheet ---
                var wsLookup = workbook.Worksheets.Add("Lookup");

                // Categories
                wsLookup.Cell(1, 1).Value = "Categories";
                wsLookup.Cell(2, 1).Value = "Select"; // Placeholder
                for (int i = 0; i < categories.Count; i++)
                    wsLookup.Cell(i + 3, 1).Value = categories[i];

                // Units
                wsLookup.Cell(1, 2).Value = "Units";
                wsLookup.Cell(2, 2).Value = "Select"; // Placeholder
                for (int i = 0; i < units.Count; i++)
                    wsLookup.Cell(i + 3, 2).Value = units[i];

                // Hide lookup sheet
                wsLookup.Visibility = XLWorksheetVisibility.VeryHidden;

                // --- Data Validation ---
                var categoryRange = wsLookup.Range(2, 1, categories.Count + 2, 1); // Include placeholder
                var unitRange = wsLookup.Range(2, 2, units.Count + 2, 2); // Include placeholder

                // Apply dropdowns for Category (col 5) and Unit (col 6)
                var categoryCells = wsData.Range("E2:E101"); // rows 2–101
                categoryCells.SetDataValidation().List(categoryRange);

                var unitCells = wsData.Range("F2:F101"); // rows 2–101
                unitCells.SetDataValidation().List(unitRange);

                // --- Set initial values to "Select" ---
                for (int row = 2; row <= 101; row++)
                {
                    wsData.Cell(row, 5).Value = "Select"; // Set "Select" for Category
                    wsData.Cell(row, 6).Value = "Select"; // Set "Select" for Unit
                }

                // --- Save to byte array ---
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public async Task<(bool Success, string Message)> UploadInventoryItemsAsync(Stream fileStream, int storeId)
        {
            try
            {
                using (var workbook = new XLWorkbook(fileStream))
                {
                    var wsData = workbook.Worksheet("Data");

                    // Validate headers
                    var headers = new[]
                    {
                "Item Name", "Description", "Supplier", "Supplier Contact Method",
                "Category", "Unit", "Cost Per Unit", "Quantity", "Threshold"
            };

                    for (int col = 1; col <= headers.Length; col++)
                    {
                        if (wsData.Cell(1, col).GetString() != headers[col - 1])
                        {
                            return (false, $"Invalid template format. Expected header '{headers[col - 1]}' in column {col}.");
                        }
                    }

                    // Read rows (skip header row)
                    var rows = wsData.RowsUsed().Skip(1);

                    var skippedItems = new List<string>(); // Track skipped items
                    foreach (var row in rows)
                    {
                        // Check if the row has no item name, stop processing further rows
                        var itemName = row.Cell(1).GetString().Trim();
                        if (string.IsNullOrWhiteSpace(itemName))
                        {
                            break; // Stop processing further rows
                        }

                        // Read other values from the row
                        var description = row.Cell(2).GetString().Trim();
                        var supplierName = row.Cell(3).GetString().Trim();
                        var supplierContactMethod = row.Cell(4).GetString().Trim();
                        var categoryName = row.Cell(5).GetString().Trim();
                        var unitName = row.Cell(6).GetString().Trim();

                        var costPerUnitCell = row.Cell(7);
                        decimal costPerUnit;
                        if (!costPerUnitCell.TryGetValue<decimal>(out costPerUnit))
                        {
                            if (costPerUnitCell.TryGetValue<int>(out var intCostPerUnit))
                            {
                                costPerUnit = intCostPerUnit; // Convert int to decimal
                            }
                            else
                            {
                                return (false, $"Invalid cost per unit in row {row.RowNumber()}.");
                            }
                        }

                        var quantityCell = row.Cell(8);
                        decimal quantity;
                        if (!quantityCell.TryGetValue<decimal>(out quantity))
                        {
                            if (quantityCell.TryGetValue<int>(out var intQuantity))
                            {
                                quantity = intQuantity; // Convert int to decimal
                            }
                            else
                            {
                                return (false, $"Invalid quantity in row {row.RowNumber()}.");
                            }
                        }

                        var thresholdCell = row.Cell(9);
                        decimal threshold;
                        if (!thresholdCell.TryGetValue<decimal>(out threshold))
                        {
                            if (thresholdCell.TryGetValue<int>(out var intThreshold))
                            {
                                threshold = intThreshold; // Convert int to decimal
                            }
                            else
                            {
                                return (false, $"Invalid threshold in row {row.RowNumber()}.");
                            }
                        }

                        // Validate required fields
                        if (string.IsNullOrWhiteSpace(supplierName) ||
                            string.IsNullOrWhiteSpace(categoryName) || string.IsNullOrWhiteSpace(unitName))
                        {
                            return (false, $"Missing required fields in row {row.RowNumber()}.");
                        }

                        // Check or add supplier
                        var supplier = await _context.Suppliers
                            .FirstOrDefaultAsync(s => s.SupplierName == supplierName &&
                                                      s.ContactMethod == supplierContactMethod &&
                                                      s.StoreId == storeId);

                        if (supplier == null)
                        {
                            supplier = new Supplier
                            {
                                SupplierName = supplierName,
                                ContactMethod = supplierContactMethod,
                                StoreId = storeId
                            };
                            _context.Suppliers.Add(supplier);
                            await _context.SaveChangesAsync(); // Save to get the new supplier ID
                        }

                        // Check category
                        var category = await _context.InventoryItemCategories
                            .FirstOrDefaultAsync(c => c.InventoryItemCategoryName == categoryName);

                        if (category == null)
                        {
                            return (false, $"Invalid category '{categoryName}' in row {row.RowNumber()}.");
                        }

                        // Check unit
                        var unit = await _context.Units
                            .FirstOrDefaultAsync(u => u.UnitName == unitName);

                        if (unit == null)
                        {
                            return (false, $"Invalid unit '{unitName}' in row {row.RowNumber()}.");
                        }

                        // Check for duplicates in the database
                        var existingItem = await _context.InventoryItems
                            .FirstOrDefaultAsync(ii =>
                                ii.InventoryItemName == itemName &&
                                ii.Description == description &&
                                ii.SupplierId == supplier.SupplierId &&
                                ii.InventoryItemCategoryId == category.InventoryItemCategoryId &&
                                ii.UnitId == unit.UnitId &&
                                ii.CostPerUnit == costPerUnit &&
                                ii.StoreId == storeId);

                        if (existingItem != null)
                        {
                            // Skip this item and log it
                            skippedItems.Add(itemName);
                            continue; // Skip to the next row
                        }

                        // Add inventory item
                        var inventoryItem = new InventoryItem
                        {
                            InventoryItemName = itemName,
                            Description = description,
                            SupplierId = supplier.SupplierId,
                            InventoryItemCategoryId = category.InventoryItemCategoryId,
                            UnitId = unit.UnitId,
                            CostPerUnit = costPerUnit,
                            Quantity = quantity,
                            MinimumQuantity = threshold,
                            StoreId = storeId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.InventoryItems.Add(inventoryItem);
                    }

                    // Save all changes
                    await _context.SaveChangesAsync();

                    // Return success message with skipped items
                    var skippedMessage = skippedItems.Any()
                        ? $"Skipped {skippedItems.Count} duplicate items: {string.Join(", ", skippedItems)}."
                        : "No duplicate items were skipped.";
                    return (true, $"Inventory items uploaded successfully. {skippedMessage}");
                }
            }
            catch (Exception ex)
            {
                // Log the exception (if logging is implemented)
                return (false, $"An error occurred while processing the file: {ex.Message}");
            }
        }

        public async Task<(bool Success, string Message)> ReceiveInventoryItemsAsync(
    List<(int InventoryItemId, decimal Quantity)> inventoryItems,
    int storeId)
        {
            try
            {
                // Validate input
                if (inventoryItems == null || !inventoryItems.Any())
                {
                    return (false, "No inventory items provided.");
                }

                // List to hold new inventory items to be added
                var newInventoryItems = new List<InventoryItem>();

                foreach (var (inventoryItemId, quantity) in inventoryItems)
                {
                    // Validate quantity
                    if (quantity <= 0)
                    {
                        return (false, $"Invalid quantity for inventory item ID {inventoryItemId}.");
                    }

                    // Check if the inventory item already exists for the store
                    var existingItem = await _context.InventoryItems
                        .FirstOrDefaultAsync(ii => ii.InventoryItemId == inventoryItemId && ii.StoreId == storeId);

                    if (existingItem != null)
                    {
                        // Update the quantity and description of the existing item
                        existingItem.Quantity += quantity;
                        existingItem.Description += " ---- received from inventory transfer";
                        existingItem.UpdatedAt = DateTime.UtcNow;
                        _context.InventoryItems.Update(existingItem);
                    }
                    else
                    {
                        // Fetch the inventory item details to create a new entry
                        var inventoryItemDetails = await _context.InventoryItems
                            .AsNoTracking()
                            .FirstOrDefaultAsync(ii => ii.InventoryItemId == inventoryItemId);

                        if (inventoryItemDetails == null)
                        {
                            return (false, $"Inventory item with ID {inventoryItemId} not found.");
                        }

                        // Create a new inventory item for the store
                        var newItem = new InventoryItem
                        {
                            InventoryItemName = inventoryItemDetails.InventoryItemName,
                            Description = inventoryItemDetails.Description + " ---- received from inventory transfer",
                            SupplierId = inventoryItemDetails.SupplierId,
                            InventoryItemCategoryId = inventoryItemDetails.InventoryItemCategoryId,
                            UnitId = inventoryItemDetails.UnitId,
                            CostPerUnit = inventoryItemDetails.CostPerUnit,
                            Quantity = quantity,
                            MinimumQuantity = inventoryItemDetails.MinimumQuantity,
                            StoreId = storeId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        newInventoryItems.Add(newItem);
                    }
                }

                // Add new inventory items to the database
                if (newInventoryItems.Any())
                {
                    await _context.InventoryItems.AddRangeAsync(newInventoryItems);
                }

                // Save changes to the database
                await _context.SaveChangesAsync();

                return (true, "Inventory items received successfully.");
            }
            catch (Exception ex)
            {
                // Log the exception (if logging is implemented)
                return (false, $"An error occurred while receiving inventory items: {ex.Message}");
            }
        }

        public async Task<bool> ValidateOrgAssociationAsync(
    int loggedInUserId,
    IEnumerable<int>? storeIds = null,
    IEnumerable<int>? userIds = null)
        {
            // Fetch the organization ID of the logged-in user
            var loggedInUserOrgId = await _context.Users
                .Where(u => u.UserId == loggedInUserId)
                .Select(u => u.OrgId)
                .FirstOrDefaultAsync();

            if (!loggedInUserOrgId.HasValue)
            {
                throw new UnauthorizedAccessException("Unable to resolve the logged-in user's organization.");
            }

            // Validate store IDs
            if (storeIds != null && storeIds.Any())
            {
                var storeOrgIds = await _context.Stores
                    .Where(s => storeIds.Contains(s.StoreId))
                    .Select(s => s.OrgId)
                    .Distinct()
                    .ToListAsync();

                // If any store's OrgId does not match the logged-in user's OrgId, return false
                if (storeOrgIds.Any(orgId => orgId != loggedInUserOrgId.Value))
                {
                    return false;
                }
            }

            // Validate user IDs
            if (userIds != null && userIds.Any())
            {
                var userOrgIds = await _context.Users
                    .Where(u => userIds.Contains(u.UserId))
                    .Select(u => u.OrgId)
                    .Distinct()
                    .ToListAsync();

                // If any user's OrgId does not match the logged-in user's OrgId, return false
                if (userOrgIds.Any(orgId => orgId != loggedInUserOrgId.Value))
                {
                    return false;
                }
            }

            // If all validations pass, return true
            return true;
        }
    }
}