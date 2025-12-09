using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for store-specific queries. Inherits common repository operations for Store.
    public interface IStoreRepository : IRepository<Store>
    {
        // Get all stores for the specified organization.
        Task<IEnumerable<Store>> GetStoresByOrganizationAsync(int organizationId);

        // Return a single store with related navigation properties populated (used by controllers).
        Task<Store?> GetByIdWithRelationsAsync(int id);

        // Return all stores including common relations (User, OperationalStatus) for listing.
        Task<IEnumerable<Store>> GetAllWithRelationsAsync(int? organizationId = null);
    }
}