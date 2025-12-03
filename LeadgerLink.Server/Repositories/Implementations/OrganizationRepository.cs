using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for organization-specific queries.
    public class OrganizationRepository : Repository<Organization>, IOrganizationRepository
    {
        private readonly LedgerLinkDbContext _context;

        public OrganizationRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context;
        }

        // Return the organization associated with the given user id.
        public async Task<Organization> GetOrganizationByUserIdAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user is not null && user.OrgId.HasValue)
            {
                return await _context.Organizations.FindAsync(user.OrgId.Value);
            }

            // Fallback: try to find an organization that owns a store tied to the user
            return await _context.Organizations
                .Include(o => o.Stores)
                .Where(o => o.Stores.Any(s => s.UserId == userId))
                .FirstOrDefaultAsync();
        }

        // Return list projection for organizations (includes industry type name, website and counts)
        public async Task<IEnumerable<OrganizationListDto>> GetListAsync()
        {
            var q = _context.Organizations
                .Select(o => new OrganizationListDto
                {
                    OrgId = o.OrgId,
                    OrgName = o.OrgName,
                    Email = o.Email,
                    Phone = o.Phone,
                    WebsiteUrl = o.WebsiteUrl, // populate website here
                    IsActive = o.IsActive,     // populate active flag
                    IndustryTypeName = o.IndustryType != null ? o.IndustryType.IndustryTypeName : null,
                    CreatedAt = o.CreatedAt,
                    StoresCount = o.Stores != null ? o.Stores.Count() : 0,
                    UsersCount = _context.Users.Count(u => u.OrgId == o.OrgId)
                })
                .AsNoTracking()
                .OrderBy(o => o.OrgName);

            return await q.ToListAsync();
        }

        // Existing detail projection used by the controller
        public async Task<OrganizationDetailDto?> GetDetailByIdAsync(int organizationId)
        {
            var q = _context.Organizations
                .Where(o => o.OrgId == organizationId)
                .Select(o => new OrganizationDetailDto
                {
                    OrgId = o.OrgId,
                    OrgName = o.OrgName,
                    Email = o.Email,
                    Phone = o.Phone,
                    IndustryTypeName = o.IndustryType != null ? o.IndustryType.IndustryTypeName : null,
                    RegestirationNumber = o.RegestirationNumber,
                    EstablishmentDate = o.EstablishmentDate,
                    WebsiteUrl = o.WebsiteUrl,
                    CreatedAt = o.CreatedAt,

                    StoresCount = o.Stores != null ? o.Stores.Count() : 0,
                    UsersCount = _context.Users.Count(u => u.OrgId == organizationId),

                    OrganizationAdminName = _context.Users
                        .Where(u => u.OrgId == organizationId)
                        .Select(u => ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim())
                        .FirstOrDefault()
                })
                .AsNoTracking();

            return await q.FirstOrDefaultAsync();
        }
    }
}//end OrganizationRepository