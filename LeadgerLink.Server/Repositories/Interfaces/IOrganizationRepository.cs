using System.Threading.Tasks;
using System.Collections.Generic;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for organization-specific queries. Inherits common repository operations for Organization.
    public interface IOrganizationRepository : IRepository<Organization>
    {
        // Return the organization associated with the specified user id.
        Task<Organization> GetOrganizationByUserIdAsync(int userId);

        // Return a projection for the organizations listing used by the client.
        Task<IEnumerable<OrganizationListDto>> GetListAsync();
        
        // Return a DTO shaped for the organization detail view (includes counts and admin name).
        Task<OrganizationDetailDto?> GetDetailByIdAsync(int organizationId);
    }
}