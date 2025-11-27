using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;


namespace LeadgerLink.Server.Repositories.Interfaces
{
	// Repository for user-specific queries. Inherits common repository operations for User.
	public interface IUserRepository : IRepository<User>
	{
		Task<User> GetTopEmployeeBySalesAsync(int storeId);
	
	}
}