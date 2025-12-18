using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for product-specific queries.
    public interface IProductRepository : IRepository<Product>
    {
        // Returns products for a store mapped to ProductListDto including availability checks.
        Task<List<ProductListDto>> GetForStoreAsync(int storeId);

        // Returns products for an organization mapped to ProductListDto including availability checks.
        Task<List<ProductListDto>> GetForOrganizationAsync(int organizationId);

        // Return detailed product projection for product detail view.
        Task<ProductDetailDto?> GetDetailByIdAsync(int productId);
        Task<(List<(int InventoryItemId, decimal Quantity)> InventoryItems, List<(int RecipeId, decimal Quantity)> Recipes)>
    SeparateProductsAsync(IEnumerable<(int ProductId, decimal Quantity)> productQuantities);
    }
}