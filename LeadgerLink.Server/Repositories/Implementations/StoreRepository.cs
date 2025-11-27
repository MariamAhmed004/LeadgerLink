using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for store-specific queries.
    public class StoreRepository : Repository<Store>, IStoreRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Require DbContext via DI.
        public StoreRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context;
        }

        // Return all stores for the specified organization.
        public async Task<IEnumerable<Store>> GetStoresByOrganizationAsync(int organizationId)
        {
            return await _context.Stores
                .Where(s => s.OrgId == organizationId)
                .ToListAsync();
        }
    }
}