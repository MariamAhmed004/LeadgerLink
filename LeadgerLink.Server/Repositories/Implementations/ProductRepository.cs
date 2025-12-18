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
    // Repository for product-specific queries.
    public class ProductRepository : Repository<Product>, IProductRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Constructor requires DbContext.
        public ProductRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Returns products for a store mapped to ProductListDto including availability checks.
        public async Task<List<ProductListDto>> GetForStoreAsync(int storeId)
        {
            // Eagerly load related inventory item and recipe -> recipe ingredients -> ingredient inventory item
            var products = await _context.Products
                .Include(p => p.InventoryItem)
                .Include(p => p.Recipe)
                    .ThenInclude(r => r.RecipeInventoryItems)
                        .ThenInclude(rii => rii.InventoryItem)
                .Where(p => p.StoreId == storeId)
                .OrderBy(p => p.ProductName)
                .ToListAsync();

            var list = products.Select(p =>
            {
                // inside GetForStoreAsync(), when constructing dto from p:
                var dto = new ProductListDto
                {
                    ProductId = p.ProductId,
                    ProductName = p.ProductName,
                    SellingPrice = p.SellingPrice,
                    Description = p.Description,              // include product description
                    InventoryItemId = p.InventoryItemId,
                    RecipeId = p.RecipeId
                };

                if (p.InventoryItemId.HasValue)
                {
                    dto.Source = "InventoryItem";
                    var ii = p.InventoryItem;
                    var qty = ii?.Quantity ?? 0m;

                    dto.InventoryItemQuantity = qty;
                    dto.IsAvailable = ii != null && qty > 0m;
                    dto.AvailabilityMessage = dto.IsAvailable ? "Available" : "Out of stock";
                }
                else if (p.RecipeId.HasValue)
                {
                    dto.Source = "Recipe";
                    var recipe = p.Recipe;

                    if (recipe == null || recipe.RecipeInventoryItems == null || !recipe.RecipeInventoryItems.Any())
                    {
                        dto.IsAvailable = false;
                        dto.AvailabilityMessage = "Recipe or ingredients not found";
                    }
                    else
                    {
                        // Check each ingredient quantity against the inventory item quantity
                        string? missing = null;
                        foreach (var rii in recipe.RecipeInventoryItems)
                        {
                            var ingredient = rii.InventoryItem;
                            // If ingredient record missing or insufficient quantity mark unavailable and note which
                            if (ingredient == null)
                            {
                                missing = $"Missing ingredient (id:{rii.InventoryItemId})";
                                break;
                            }

                            // required quantity per recipe entry
                            var requiredQty = rii.Quantity;
                            if (ingredient.Quantity < requiredQty)
                            {
                                missing = ingredient.InventoryItemName ?? $"Ingredient {rii.InventoryItemId} low";
                                break;
                            }
                        }

                        dto.IsAvailable = string.IsNullOrEmpty(missing);
                        dto.AvailabilityMessage = dto.IsAvailable ? "Available" : $"Unavailable: {missing}";
                        // For recipes compute how many full recipe portions can be made: min floor(ingredientQty / requiredQty)
                        try
                        {
                            var perIngCounts = recipe.RecipeInventoryItems
                                .Where(rii => rii.Quantity > 0)
                                .Select(rii =>
                                {
                                    var avail = rii.InventoryItem != null ? rii.InventoryItem.Quantity : 0m;
                                    var req = rii.Quantity;
                                    return req > 0 ? (int)Math.Floor(avail / req) : 0;
                                })
                                .ToList();
                            dto.AvailableQuantity = perIngCounts.Count > 0 ? (int?)perIngCounts.Min() : 0;
                        }
                        catch
                        {
                            dto.AvailableQuantity = null;
                        }
                        // For recipes we do not expose a single InventoryItemQuantity; leave null.
                        dto.InventoryItemQuantity = null;
                    }
                }
                else
                {
                    dto.Source = "Unknown";
                    dto.IsAvailable = false;
                    dto.AvailabilityMessage = "No source";
                    dto.InventoryItemQuantity = null;
                }

                return dto;
            }).ToList();

            return list;
        }

        // New: detailed product projection
        public async Task<ProductDetailDto?> GetDetailByIdAsync(int productId)
        {
            var q = _context.Products
                .Where(p => p.ProductId == productId)
                .Include(p => p.Recipe)
                .Include(p => p.InventoryItem)
                .Include(p => p.Store)
                .Include(p => p.VatCategory)
                .AsNoTracking();

            var dto = await q.Select(p => new ProductDetailDto
            {
                ProductId = p.ProductId,
                ProductName = p.ProductName,
                SellingPrice = p.SellingPrice,
                CostPrice = p.CostPrice,
                StoreId = p.StoreId,
                StoreName = p.Store != null ? p.Store.StoreName : null,
                IsRecipe = p.RecipeId.HasValue,
                RecipeId = p.RecipeId,
                InventoryItemId = p.InventoryItemId,
                RecipeName = p.Recipe != null ? p.Recipe.RecipeName : null,
                InventoryItemName = p.InventoryItem != null ? p.InventoryItem.InventoryItemName : null,
                Description = p.Description,
                VatCategoryId = p.VatCategoryId,
                VatCategoryName = p.VatCategory != null ? p.VatCategory.VatCategoryName : null,
                ImageUrl = p.RecipeId.HasValue
                    ? (p.Recipe != null && p.Recipe.Image != null && p.Recipe.Image.Length > 0
                        ? $"data:image;base64,{Convert.ToBase64String(p.Recipe.Image)}"
                        : null)
                    : (p.InventoryItem != null && p.InventoryItem.InventoryItemImage != null && p.InventoryItem.InventoryItemImage.Length > 0
                        ? $"data:image;base64,{Convert.ToBase64String(p.InventoryItem.InventoryItemImage)}"
                        : null)

            }).FirstOrDefaultAsync();

            return dto;
        }

        // Returns products for an organization mapped to ProductListDto including availability checks.
        public async Task<List<ProductListDto>> GetForOrganizationAsync(int organizationId)
        {
            var products = await _context.Products
                .Include(p => p.InventoryItem)
                .Include(p => p.Recipe)
                    .ThenInclude(r => r.RecipeInventoryItems)
                        .ThenInclude(rii => rii.InventoryItem)
                .Include(p => p.Store)
                .Where(p => p.Store != null && p.Store.OrgId == organizationId)
                .OrderBy(p => p.ProductName)
                .ToListAsync();

            var list = products.Select(p =>
            {
                var dto = new ProductListDto
                {
                    ProductId = p.ProductId,
                    ProductName = p.ProductName,
                    SellingPrice = p.SellingPrice,
                    Description = p.Description,
                    InventoryItemId = p.InventoryItemId,
                    RecipeId = p.RecipeId,
                    StoreId = p.StoreId,
                    StoreName = p.Store?.StoreName
                };

                if (p.InventoryItemId.HasValue)
                {
                    dto.Source = "InventoryItem";
                    var ii = p.InventoryItem;
                    var qty = ii?.Quantity ?? 0m;

                    dto.InventoryItemQuantity = qty;
                    dto.IsAvailable = ii != null && qty > 0m;
                    dto.AvailabilityMessage = dto.IsAvailable ? "Available" : "Out of stock";
                }
                else if (p.RecipeId.HasValue)
                {
                    dto.Source = "Recipe";
                    var recipe = p.Recipe;

                    if (recipe == null || recipe.RecipeInventoryItems == null || !recipe.RecipeInventoryItems.Any())
                    {
                        dto.IsAvailable = false;
                        dto.AvailabilityMessage = "Recipe or ingredients not found";
                    }
                    else
                    {
                        string? missing = null;
                        foreach (var rii in recipe.RecipeInventoryItems)
                        {
                            var ingredient = rii.InventoryItem;
                            if (ingredient == null)
                            {
                                missing = $"Missing ingredient (id:{rii.InventoryItemId})";
                                break;
                            }

                            var requiredQty = rii.Quantity;
                            if (ingredient.Quantity < requiredQty)
                            {
                                missing = ingredient.InventoryItemName ?? $"Ingredient {rii.InventoryItemId} low";
                                break;
                            }
                        }

                        dto.IsAvailable = string.IsNullOrEmpty(missing);
                        dto.AvailabilityMessage = dto.IsAvailable ? "Available" : $"Unavailable: {missing}";

                        try
                        {
                            var perIngCounts = recipe.RecipeInventoryItems
                                .Where(rii => rii.Quantity > 0)
                                .Select(rii =>
                                {
                                    var avail = rii.InventoryItem != null ? rii.InventoryItem.Quantity : 0m;
                                    var req = rii.Quantity;
                                    return req > 0 ? (int)Math.Floor(avail / req) : 0;
                                })
                                .ToList();
                            dto.AvailableQuantity = perIngCounts.Count > 0 ? (int?)perIngCounts.Min() : 0;
                        }
                        catch
                        {
                            dto.AvailableQuantity = null;
                        }

                        dto.InventoryItemQuantity = null;
                    }
                }
                else
                {
                    dto.Source = "Unknown";
                    dto.IsAvailable = false;
                    dto.AvailabilityMessage = "No source";
                    dto.InventoryItemQuantity = null;
                }

                return dto;
            }).ToList();

            return list;
        }

        public async Task<(List<(int InventoryItemId, decimal Quantity)> InventoryItems, List<(int RecipeId, decimal Quantity)> Recipes)>
    SeparateProductsAsync(IEnumerable<(int ProductId, decimal Quantity)> productQuantities)
{
    var inventoryItems = new List<(int InventoryItemId, decimal Quantity)>();
    var recipes = new List<(int RecipeId, decimal Quantity)>();

    foreach (var (productId, quantity) in productQuantities)
    {
        var product = await _context.Products
            .Include(p => p.InventoryItem)
            .Include(p => p.Recipe)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.ProductId == productId);

        if (product == null)
        {
            throw new InvalidOperationException($"Product with ID {productId} not found.");
        }

        if (product.InventoryItemId.HasValue)
        {
            inventoryItems.Add((product.InventoryItemId.Value, quantity));
        }
        else if (product.RecipeId.HasValue)
        {
            recipes.Add((product.RecipeId.Value, quantity));
        }
        else
        {
            throw new InvalidOperationException($"Product with ID {productId} has no associated inventory item or recipe.");
        }
    }

    return (inventoryItems, recipes);
}
    }
}