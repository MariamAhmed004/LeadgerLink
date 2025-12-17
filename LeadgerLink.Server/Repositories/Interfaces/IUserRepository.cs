using System.Threading.Tasks;
using System.Collections.Generic;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for user-specific queries. Inherits common repository operations for User.
    public interface IUserRepository : IRepository<User>
    {
        Task<User> GetTopEmployeeBySalesAsync(int storeId);

        // Return lightweight user items for a given store (used to populate filter select)
        Task<IEnumerable<UserListItemDto>> GetUsersByStoreAsync(int storeId);

        // Return a projection for the user detail view (used by GET /api/users/{id})
        Task<UserDetailDto?> GetDetailByIdAsync(int userId);

        // Return list projection for users (reuses UserDetailDto fields as needed)
        Task<IEnumerable<UserDetailDto>> GetListAsync();
        Task ActivateStoreManagerAsync(int userId, int storeId);
            Task DeactivateStoreManagerAsync(int userId);
        Task<User> GetByIdRelationAsync(int id);
    }
}