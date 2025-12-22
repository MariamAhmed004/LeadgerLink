using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos.InventoryItemDtos;
using LeadgerLink.Server.Dtos.RecipeDtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for recipe-specific queries.
    public interface IRecipeRepository : IRepository<Recipe>
    {
        // Return ingredient utilization percentages for a store.
        Task<IEnumerable<IngredientUtilizationDto>> GetIngredientUtilizationPercentageAsync(int storeId);

        // Return the most sold recipe for an organization (by quantity sold).
        Task<Recipe> GetMostSoldRecipeByOrganizationAsync(int organizationId);

        // Return the most sold recipe for a store (by quantity sold).
        Task<Recipe> GetMostSoldRecipeByStoreAsync(int storeId);

        // Return recipes for a store.
        Task<IEnumerable<Recipe>> GetRecipesByStoreAsync(int storeId);

        // Return a recipe including its ingredient entries.
        Task<Recipe> GetRecipeWithIngredientsAsync(int recipeId);

        // Return detailed recipe projection including ingredients, creator, image, and related product info
        Task<RecipeDetailDto?> GetDetailByIdAsync(int recipeId, int loggedInUserId);
        // Return all recipes, optionally filtered by organization ID.
        Task<IEnumerable<RecipeListDto>> GetAllRecipesAsync(int? orgId);
        // Return recipes for the authenticated user's store.
        Task<IEnumerable<RecipeListDto>> GetRecipesForCurrentStoreAsync(string email);
        // Create a new recipe with ingredients and optional product linkage.
        Task<int> CreateRecipeAsync(
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
        );

        // Update an existing recipe with ingredients and optionally product linkage.
        Task UpdateRecipeAsync(
            int recipeId,
            UpdateRecipeDto dto,
            HttpRequest request
        );
        Task<(bool Success, string Message)> ReceiveRecipesAsync(
    List<(int RecipeId, decimal Quantity)> recipes,
    int storeId);
        // Deletes a recipe along with its associated product, transfer items, sale items, and inventory items.
        Task<bool> DeleteRecipeAsync(int recipeId);
    }
}