using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

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
    }
}//end IRecipeRepository