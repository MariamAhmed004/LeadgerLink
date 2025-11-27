using System.Threading.Tasks;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for organization-specific queries. Inherits common repository operations for Organization.
    public interface IOrganizationRepository : IRepository<Organization>
    {
        // Return the organization associated with the specified user id.
        Task<Organization> GetOrganizationByUserIdAsync(int userId);
    }
}