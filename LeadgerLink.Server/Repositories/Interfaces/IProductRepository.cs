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

        // Return detailed product projection for product detail view.
        Task<ProductDetailDto?> GetDetailByIdAsync(int productId);
    }
}