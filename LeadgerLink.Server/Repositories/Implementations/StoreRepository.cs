using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for store-specific queries.
    public class StoreRepository : Repository<Store>, IStoreRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IHttpContextAccessor _httpContext;

        // Require DbContext via DI.
        public StoreRepository(LedgerLinkDbContext context, IHttpContextAccessor httpContextAccessor) : base(context)
        {
            _context = context;
            _httpContext = httpContextAccessor;
        }

        // Return all stores for the specified organization.
        public async Task<IEnumerable<Store>> GetStoresByOrganizationAsync(int organizationId)
        {
            return await _context.Stores
                .Where(s => s.OrgId == organizationId)
                .ToListAsync();
        }

        // Return single store by id including commonly needed navigation properties.
        public async Task<Store?> GetByIdWithRelationsAsync(int id)
        {
            return await _context.Stores
                .Include(s => s.User)               // store.User -> branch manager / owner
                .Include(s => s.OperationalStatus) // human friendly status name
                .Include(s => s.Org)               // organization if needed
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StoreId == id);
        }

        // Return operational statuses as lightweight projections for client selects
        public async Task<IEnumerable<object>> GetOperationalStatusesAsync()
        {
            return await _context.OperationalStatuses
                .Select(os => new
                {
                    operationalStatusId = os.OperationalStatusId,
                    operationalStatusName = os.OperationalStatusName
                })
                .AsNoTracking()
                .ToListAsync<object>();
        }

        // Return all stores INCLUDING relations, filtered to the current logged-in user's organization.
        public async Task<IEnumerable<Store>> GetAllWithRelationsAsync()
        {
            // Resolve current user email from claims
            var email = _httpContext?.HttpContext?.User?.Claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? _httpContext?.HttpContext?.User?.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Enumerable.Empty<Store>();

            // Find domain user and org id
            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.OrgId.HasValue)
                return Enumerable.Empty<Store>();

            var orgId = domainUser.OrgId.Value;

            return await _context.Stores
                .Where(s => s.OrgId == orgId)
                .Include(s => s.User)
                .Include(s => s.OperationalStatus)
                .AsNoTracking()
                .ToListAsync();
        }
    }
}