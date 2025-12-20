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
    // Repository for recipe-specific queries.
    public class RecipeRepository : Repository<Recipe>, IRecipeRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Constructor requires DbContext.
        public RecipeRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Return ingredient utilization percentages for a store.
        public async Task<IEnumerable<IngredientUtilizationDto>> GetIngredientUtilizationPercentageAsync(int storeId)
        {
            // Sum quantity per inventory item across recipes that belong to the specified store.
            var itemSums = await _context.RecipeInventoryItems
                .Include(rii => rii.InventoryItem)
                .Include(rii => rii.Recipe)
                .Where(rii => rii.Recipe.StoreId == storeId)
                .GroupBy(rii => new { rii.InventoryItemId, Name = rii.InventoryItem != null ? rii.InventoryItem.InventoryItemName : null })
                .Select(g => new
                {
                    InventoryItemId = g.Key.InventoryItemId,
                    InventoryItemName = g.Key.Name,
                    Quantity = g.Sum(x => x.Quantity)
                })
                .ToListAsync();

            var total = itemSums.Sum(x => x.Quantity);

            if (!itemSums.Any())
                return Array.Empty<IngredientUtilizationDto>();

            return itemSums.Select(x => new IngredientUtilizationDto
            {
                InventoryItemId = x.InventoryItemId,
                InventoryItemName = x.InventoryItemName,
                Quantity = x.Quantity,
                Percentage = total == 0m ? 0m : Math.Round((x.Quantity / total) * 100m, 2)
            });
        }

        // Return the most sold recipe for an organization (by quantity sold).
        public async Task<Recipe> GetMostSoldRecipeByOrganizationAsync(int organizationId)
        {
            var top = await _context.SaleItems
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Include(si => si.Sale)
                .ThenInclude(s => s.Store)
                .Where(si => si.Product != null
                             && si.Product.RecipeId != null
                             && si.Sale.Store.OrgId == organizationId)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, Qty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.Qty)
                .FirstOrDefaultAsync();

            if (top?.RecipeId == null) return null!;

            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                .FirstOrDefaultAsync(r => r.RecipeId == top.RecipeId);
        }

        // Return the most sold recipe for a store (by quantity sold).
        public async Task<Recipe> GetMostSoldRecipeByStoreAsync(int storeId)
        {
            var top = await _context.SaleItems
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Include(si => si.Sale)
                .Where(si => si.Product != null
                             && si.Product.RecipeId != null
                             && si.Sale.StoreId == storeId)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, Qty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.Qty)
                .FirstOrDefaultAsync();

            if (top?.RecipeId == null) return null!;

            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                .FirstOrDefaultAsync(r => r.RecipeId == top.RecipeId);
        }

        // Return recipes for a store.
        public async Task<IEnumerable<Recipe>> GetRecipesByStoreAsync(int storeId)
        {
            return await _context.Recipes
                .Where(r => r.StoreId == storeId)
                .ToListAsync();
        }

        // Return a recipe including its ingredient entries.
        public async Task<Recipe> GetRecipeWithIngredientsAsync(int recipeId)
        {
            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                .FirstOrDefaultAsync(r => r.RecipeId == recipeId);
        }

        // Return detailed recipe DTO including ingredients and related product info.
        public async Task<RecipeDetailDto?> GetDetailByIdAsync(int recipeId)
        {
            var q = _context.Recipes
                .Where(r => r.RecipeId == recipeId)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .Include(r => r.Products)
                .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                .AsNoTracking()
                .AsEnumerable();

            var dto = q.Select(r => new RecipeDetailDto
            {
                RecipeId = r.RecipeId,
                RecipeName = r.RecipeName,
                Description = r.Instructions,
                StoreId = r.StoreId,
                StoreName = r.Store != null ? r.Store.StoreName : null,
                CreatedByName = r.CreatedByNavigation != null ? ((r.CreatedByNavigation.UserFirstname ?? "") + " " + (r.CreatedByNavigation.UserLastname ?? "")).Trim() : null,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                Image = (r.Image != null && r.Image.Length > 0)
                    ? $"data:image;base64,{Convert.ToBase64String(r.Image)}"
                    : null,
                IsOnSale = r.Products.Any(),
                RelatedProductId = r.Products.FirstOrDefault() != null ? (int?)r.Products.FirstOrDefault()!.ProductId : null,
                Ingredients = r.RecipeInventoryItems.Select(rii => new RecipeIngredientDto
                {
                    RecipeInventoryItemId = rii.RecipeInventoryItemId,
                    InventoryItemId = rii.InventoryItemId,
                    InventoryItemName = rii.InventoryItem != null ? rii.InventoryItem.InventoryItemName : null,
                    Quantity = rii.Quantity
                }).ToList()
            }).FirstOrDefault();

            return await Task.FromResult(dto);
        }

        // Return all recipes, optionally filtered by organization ID.
        public async Task<IEnumerable<RecipeListDto>> GetAllRecipesAsync(int? orgId)
        {
            var query = _context.Recipes
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .AsQueryable();

            // Apply organization filter if provided
            if (orgId.HasValue)
            {
                query = query.Where(r => r.Store != null && r.Store.OrgId == orgId.Value);
            }

            // Project to RecipeListDto and return the result
            return await query
                .OrderByDescending(r => r.UpdatedAt)
                .Select(r => new RecipeListDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    CreatedById = r.CreatedBy,
                    CreatedByName = r.CreatedByNavigation != null ? (r.CreatedByNavigation.UserFirstname + " " + r.CreatedByNavigation.UserLastname).Trim() : null,
                    StoreId = r.StoreId,
                    StoreName = r.Store != null ? r.Store.StoreName : null,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    InSale = r.Products.Any(),
                    SellingPrice = r.Products != null && r.Products.Any() ? r.Products.Select(p => p.SellingPrice).FirstOrDefault() : null,
                })
                .ToListAsync();
        }

        // Return recipes for the authenticated user's store.
        public async Task<IEnumerable<RecipeListDto>> GetRecipesForCurrentStoreAsync(string email)
        {
            // Fetch the user based on the provided email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Array.Empty<RecipeListDto>();

            var storeId = user.StoreId.Value;

            // Fetch recipes for the user's store
            var entities = await _context.Recipes
                .Where(r => r.StoreId == storeId)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                .Include(r => r.Products)
                .OrderByDescending(r => r.UpdatedAt)
                .ToListAsync();

            // Map recipes to RecipeListDto
            return entities.Select(r =>
            {
                // Compute availability: min floor(available / required) across ingredients
                int availableCount = 0;
                if (r.RecipeInventoryItems != null && r.RecipeInventoryItems.Any())
                {
                    var perIng = r.RecipeInventoryItems
                        .Where(rii => rii.Quantity > 0)
                        .Select(rii =>
                        {
                            var avail = rii.InventoryItem != null ? rii.InventoryItem.Quantity : 0m;
                            var req = rii.Quantity;
                            var count = req > 0 ? (int)Math.Floor((avail) / req) : 0;
                            return count;
                        })
                        .ToList();
                    availableCount = perIng.Count > 0 ? perIng.Min() : 0;
                }

                return new RecipeListDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    CreatedById = r.CreatedBy,
                    CreatedByName = r.CreatedByNavigation != null ? (r.CreatedByNavigation.UserFirstname + " " + r.CreatedByNavigation.UserLastname).Trim() : null,
                    StoreId = r.StoreId,
                    StoreName = r.Store != null ? r.Store.StoreName : null,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    InSale = r.Products != null && r.Products.Any(),
                    ImageUrl = r.Image != null && r.Image.Length > 0
                                   ? $"data:image;base64,{Convert.ToBase64String(r.Image)}"
                                   : null,
                    Description = r.Products != null && r.Products.Any() ? r.Products.Select(p => p.Description).FirstOrDefault() : null,
                    SellingPrice = r.Products != null && r.Products.Any() ? r.Products.Select(p => p.SellingPrice).FirstOrDefault() : null,
                    RelatedProductId = r.Products != null ? r.Products.Select(p => (int?)p.ProductId).FirstOrDefault() : null,
                    Available = availableCount
                };
            }).ToList();
        }
        // Create a new recipe with ingredients and optional product linkage.
        public async Task<int> CreateRecipeAsync(
            string recipeName,
            string? instructions,
            int createdBy,
            int storeId,
            IEnumerable<RecipeIngredientDto> ingredients,
            bool isOnSale,
            int? vatCategoryId,
            string? productDescription,
            decimal? clientCostPrice,
            decimal? clientSellingPrice,
            HttpRequest request
        )
        {
            var recipe = new Recipe
            {
                RecipeName = recipeName,
                Instructions = instructions,
                CreatedBy = createdBy,
                StoreId = storeId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Absorb image from multipart if present
            if (request.HasFormContentType && request.Form.Files.Count > 0)
            {
                var imageFile = request.Form.Files
                    .FirstOrDefault(f => string.Equals(f.Name, "image", StringComparison.OrdinalIgnoreCase)
                                         || (f.ContentType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ?? false));
                if (imageFile != null && imageFile.Length > 0)
                {
                    using var ms = new MemoryStream();
                    await imageFile.CopyToAsync(ms);
                    recipe.Image = ms.ToArray();
                }
            }

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            // Add ingredients using DTO
            foreach (var ing in ingredients)
            {
                if (!ing.InventoryItemId.HasValue || !ing.Quantity.HasValue || ing.Quantity.Value <= 0) continue;

                var rii = new RecipeInventoryItem
                {
                    RecipeId = recipe.RecipeId,
                    InventoryItemId = ing.InventoryItemId.Value,
                    Quantity = ing.Quantity!.Value
                };
                _context.RecipeInventoryItems.Add(rii);
            }
            await _context.SaveChangesAsync();

            // If on sale, create product linked to recipe
            if (isOnSale)
            {
                if (!vatCategoryId.HasValue) throw new ArgumentException("VAT category is required when marking recipe on sale.");

                // Compute cost price by summing ingredient costPerUnit * quantity unless client provided value
                decimal costPrice = clientCostPrice ?? 0m;
                if (!clientCostPrice.HasValue)
                {
                    foreach (var ing in ingredients)
                    {
                        if (!ing.InventoryItemId.HasValue || !ing.Quantity.HasValue) continue;
                        var inv = await _context.InventoryItems.FindAsync(ing.InventoryItemId.Value);
                        if (inv != null)
                        {
                            costPrice += inv.CostPerUnit * ing.Quantity.Value;
                        }
                    }
                }

                // Compute selling price: prefer client value, otherwise cost + VAT
                decimal sellingPrice = clientSellingPrice ?? costPrice;
                if (!clientSellingPrice.HasValue)
                {
                    var vatEntity = await _context.VatCategories.FindAsync(vatCategoryId.Value);
                    if (vatEntity != null)
                    {
                        sellingPrice = costPrice + (costPrice * (vatEntity.VatRate / 100m));
                    }
                }

                var product = new Product
                {
                    ProductName = recipe.RecipeName,
                    StoreId = storeId,
                    IsRecipe = true,
                    RecipeId = recipe.RecipeId,
                    InventoryItemId = null,
                    VatCategoryId = vatCategoryId.Value,
                    Description = productDescription,
                    SellingPrice = sellingPrice,
                    CostPrice = costPrice
                };
                _context.Products.Add(product);
                await _context.SaveChangesAsync();
            }

            return recipe.RecipeId;
        }

        // Update an existing recipe with ingredients and optionally product linkage.
        public async Task UpdateRecipeAsync(
            int recipeId,
            UpdateRecipeDto dto,
            HttpRequest request
        )
        {
            var recipe = await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                .FirstOrDefaultAsync(r => r.RecipeId == recipeId);

            if (recipe == null)
                throw new KeyNotFoundException("Recipe not found.");

            recipe.RecipeName = string.IsNullOrWhiteSpace(dto.RecipeName) ? recipe.RecipeName : dto.RecipeName.Trim();
            recipe.Instructions = string.IsNullOrWhiteSpace(dto.Instructions) ? null : dto.Instructions.Trim();
            recipe.UpdatedAt = DateTime.UtcNow;

            // Handle image if present in multipart
            if (request.HasFormContentType && request.Form.Files.Count > 0)
            {
                var imageFile = request.Form.Files.FirstOrDefault(f =>
                    string.Equals(f.Name, "image", StringComparison.OrdinalIgnoreCase) ||
                    (f.ContentType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ?? false));
                if (imageFile != null && imageFile.Length > 0)
                {
                    using var ms = new MemoryStream();
                    await imageFile.CopyToAsync(ms);
                    recipe.Image = ms.ToArray();
                }
            }

            // Replace ingredients
            var existingIngredients = _context.RecipeInventoryItems.Where(rii => rii.RecipeId == recipeId);
            _context.RecipeInventoryItems.RemoveRange(existingIngredients);
            await _context.SaveChangesAsync();

            if (dto.Ingredients != null && dto.Ingredients.Any())
            {
                foreach (var ing in dto.Ingredients)
                {
                    if (!ing.InventoryItemId.HasValue || !ing.Quantity.HasValue || ing.Quantity.Value <= 0) continue;

                    var rii = new RecipeInventoryItem
                    {
                        RecipeId = recipe.RecipeId,
                        InventoryItemId = ing.InventoryItemId.Value,
                        Quantity = ing.Quantity.Value
                    };
                    _context.RecipeInventoryItems.Add(rii);
                }
            }

            await _context.SaveChangesAsync();

            // Handle on-sale product linkage: only create product if missing; DO NOT update existing product fields here
            var product = await _context.Products.FirstOrDefaultAsync(p => p.RecipeId == recipeId);
            if (dto.IsOnSale)
            {
                if (product == null)
                {
                    if (!dto.VatCategoryId.HasValue)
                        throw new ArgumentException("VAT category is required when marking recipe on sale.");

                    // Compute cost price by summing ingredient costPerUnit * quantity unless DTO provided
                    decimal costPrice = dto.CostPrice ?? 0m;
                    if (!dto.CostPrice.HasValue)
                    {
                        costPrice = 0m;
                        foreach (var ing in dto.Ingredients ?? Array.Empty<RecipeIngredientDto>())
                        {
                            if (!ing.InventoryItemId.HasValue || !ing.Quantity.HasValue) continue;
                            var inv = await _context.InventoryItems.FindAsync(ing.InventoryItemId.Value);
                            if (inv != null)
                            {
                                costPrice += inv.CostPerUnit * ing.Quantity.Value;
                            }
                        }
                    }

                    decimal sellingPrice = dto.SellingPrice ?? costPrice;
                    if (!dto.SellingPrice.HasValue)
                    {
                        var vatEntity = await _context.VatCategories.FindAsync(dto.VatCategoryId.Value);
                        if (vatEntity != null)
                        {
                            sellingPrice = costPrice + (costPrice * (vatEntity.VatRate / 100m));
                        }
                    }

                    var newProduct = new Product
                    {
                        ProductName = recipe.RecipeName,
                        StoreId = recipe.StoreId ?? 0,
                        IsRecipe = true,
                        RecipeId = recipe.RecipeId,
                        InventoryItemId = null,
                        VatCategoryId = dto.VatCategoryId!.Value,
                        Description = string.IsNullOrWhiteSpace(dto.ProductDescription) ? null : dto.ProductDescription.Trim(),
                        SellingPrice = sellingPrice,
                        CostPrice = costPrice
                    };
                    _context.Products.Add(newProduct);
                    await _context.SaveChangesAsync();
                }
            }
        }

        public async Task<(bool Success, string Message)> ReceiveRecipesAsync(
    List<(int RecipeId, decimal Quantity)> recipes,
    int storeId)
        {
            try
            {
                // Validate input
                if (recipes == null || !recipes.Any())
                {
                    return (false, "No recipes provided.");
                }

                // Create a copy of the recipes collection to ensure it is not modified during enumeration
                var recipesCopy = recipes.ToList();

                foreach (var (recipeId, recipeQuantity) in recipesCopy)
                {
                    // Validate recipe quantity
                    if (recipeQuantity <= 0)
                    {
                        return (false, $"Invalid quantity for recipe ID {recipeId}.");
                    }

                    // Fetch the recipe with its ingredients
                    var recipe = await _context.Recipes
                        .Include(r => r.RecipeInventoryItems)
                        .FirstOrDefaultAsync(r => r.RecipeId == recipeId);

                    if (recipe == null)
                    {
                        return (false, $"Recipe with ID {recipeId} not found.");
                    }

                    // Create a copy of the RecipeInventoryItems collection to ensure it is not modified during enumeration
                    var recipeInventoryItemsCopy = recipe.RecipeInventoryItems.ToList();

                    // Process each ingredient in the recipe
                    foreach (var ingredient in recipeInventoryItemsCopy)
                    {
                        if (ingredient.Quantity <= 0)
                        {
                            continue; // Skip invalid ingredients
                        }

                        // Calculate the total quantity required for the ingredient
                        var totalIngredientQuantity = ingredient.Quantity * recipeQuantity;

                        // Fetch the inventory item for the store
                        var inventoryItem = await _context.InventoryItems
                            .FirstOrDefaultAsync(ii => ii.InventoryItemId == ingredient.InventoryItemId && ii.StoreId == storeId);

                        if (inventoryItem != null)
                        {
                            // Update the quantity of the existing inventory item
                            inventoryItem.Quantity += totalIngredientQuantity;
                            inventoryItem.UpdatedAt = DateTime.UtcNow;
                            _context.InventoryItems.Update(inventoryItem);
                        }
                        else
                        {
                            // Fetch the inventory item details to create a new entry
                            var inventoryItemDetails = await _context.InventoryItems
                                .AsNoTracking()
                                .FirstOrDefaultAsync(ii => ii.InventoryItemId == ingredient.InventoryItemId);

                            if (inventoryItemDetails == null)
                            {
                                return (false, $"Inventory item with ID {ingredient.InventoryItemId} not found.");
                            }

                            // Create a new inventory item for the store
                            var newItem = new InventoryItem
                            {
                                InventoryItemName = inventoryItemDetails.InventoryItemName,
                                Description = inventoryItemDetails.Description + " ---- received from recipe transfer",
                                SupplierId = inventoryItemDetails.SupplierId,
                                InventoryItemCategoryId = inventoryItemDetails.InventoryItemCategoryId,
                                UnitId = inventoryItemDetails.UnitId,
                                CostPerUnit = inventoryItemDetails.CostPerUnit,
                                Quantity = totalIngredientQuantity,
                                MinimumQuantity = inventoryItemDetails.MinimumQuantity,
                                StoreId = storeId,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };

                            await _context.InventoryItems.AddAsync(newItem);

                            // Add a record for RecipeInventoryItem to associate the ingredient with the recipe
                            var recipeInventoryItem = new RecipeInventoryItem
                            {
                                RecipeId = recipeId,
                                InventoryItemId = inventoryItemDetails.InventoryItemId,
                                Quantity = ingredient.Quantity
                            };

                            await _context.RecipeInventoryItems.AddAsync(recipeInventoryItem);
                        }
                    }
                }

                // Save changes to the database
                await _context.SaveChangesAsync();

                return (true, "Recipes received successfully.");
            }
            catch (Exception ex)
            {
                // Log the exception (if logging is implemented)
                return (false, $"An error occurred while receiving recipes: {ex.Message}");
            }
        }
    }
}