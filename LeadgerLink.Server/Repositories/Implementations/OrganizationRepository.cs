using System;
using System.Collections.Generic;
using System.Text;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

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
    }
}//end OrganizationRepository