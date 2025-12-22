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
        public async Task<ProductDetailDto?> GetDetailByIdAsync(int productId, int loggedInUserId)
        {
            // Fetch the product with related data
            var product = await _context.Products
                .Where(p => p.ProductId == productId)
                .Include(p => p.Recipe)
                .Include(p => p.InventoryItem)
                .Include(p => p.Store)
                .Include(p => p.VatCategory)
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (product == null) return null;

            // Validate that the product's store belongs to the same organization as the logged-in user
            var isValid = await ValidateOrgAssociationAsync(
                loggedInUserId: loggedInUserId,
                storeIds: product.StoreId.HasValue ? new[] { product.StoreId.Value } : Enumerable.Empty<int>()
            );

            if (!isValid)
            {
                throw new UnauthorizedAccessException("The product's store does not belong to the same organization as the logged-in user.");
            }

            // Map the product to the ProductDetailDto
            var dto = new ProductDetailDto
            {
                ProductId = product.ProductId,
                ProductName = product.ProductName,
                SellingPrice = product.SellingPrice,
                CostPrice = product.CostPrice,
                StoreId = product.StoreId,
                StoreName = product.Store != null ? product.Store.StoreName : null,
                IsRecipe = product.RecipeId.HasValue,
                RecipeId = product.RecipeId,
                InventoryItemId = product.InventoryItemId,
                RecipeName = product.Recipe != null ? product.Recipe.RecipeName : null,
                InventoryItemName = product.InventoryItem != null ? product.InventoryItem.InventoryItemName : null,
                Description = product.Description,
                VatCategoryId = product.VatCategoryId,
                VatCategoryName = product.VatCategory != null ? product.VatCategory.VatCategoryName : null,
                ImageUrl = product.RecipeId.HasValue
                    ? (product.Recipe != null && product.Recipe.Image != null && product.Recipe.Image.Length > 0
                        ? $"data:image;base64,{Convert.ToBase64String(product.Recipe.Image)}"
                        : null)
                    : (product.InventoryItem != null && product.InventoryItem.InventoryItemImage != null && product.InventoryItem.InventoryItemImage.Length > 0
                        ? $"data:image;base64,{Convert.ToBase64String(product.InventoryItem.InventoryItemImage)}"
                        : null)
            };

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

        public async Task<bool> DeleteProductAsync(int productId)
        {
            // Fetch the product with related data
            var product = await _context.Products
                .Include(p => p.Recipe)
                .Include(p => p.InventoryItem)
                .FirstOrDefaultAsync(p => p.ProductId == productId);

            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {productId} not found.");
            }

            

            // Delete all sale items associated with this product
            var saleItems = await _context.SaleItems
                .Where(si => si.ProductId == productId)
                .ToListAsync();

            if (saleItems.Any())
            {
                _context.SaleItems.RemoveRange(saleItems);
            }

            // Delete the product
            _context.Products.Remove(product);

            // Save changes to the database
            await _context.SaveChangesAsync();

            return true;
        }
    }
}