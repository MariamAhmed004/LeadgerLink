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
	}
}