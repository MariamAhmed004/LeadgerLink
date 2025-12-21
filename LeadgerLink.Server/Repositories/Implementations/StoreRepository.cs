using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Contexts;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for store-specific queries.
    public class StoreRepository : Repository<Store>, IStoreRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IHttpContextAccessor _httpContext;
        private readonly IUserRepository _userRepository;
        private readonly IAuditContext _auditContext;

        // Require DbContext via DI.
        public StoreRepository(LedgerLinkDbContext context, IHttpContextAccessor httpContextAccessor, IUserRepository userRepository, IAuditContext auditContext) : base(context)
        {
            _context = context;
            _httpContext = httpContextAccessor;
            _userRepository = userRepository;
            _auditContext = auditContext;
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

        // Return all stores INCLUDING relations, optionally filtered by provided organizationId.
        // If organizationId is null, resolve from current logged-in user via IHttpContextAccessor.
        public async Task<IEnumerable<Store>> GetAllWithRelationsAsync(int? organizationId = null)
        {
            int? orgId = organizationId;

            if (!orgId.HasValue)
            {
                var email = _httpContext?.HttpContext?.User?.Claims?.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? _httpContext?.HttpContext?.User?.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Enumerable.Empty<Store>();

                var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (domainUser == null || !domainUser.OrgId.HasValue) return Enumerable.Empty<Store>();
                orgId = domainUser.OrgId.Value;
            }

            return await _context.Stores
                .Where(s => s.OrgId == orgId.Value)
                .Include(s => s.User)
                .Include(s => s.OperationalStatus)
                .AsNoTracking()
                .ToListAsync();
        }

        // Reassigns the manager for a store, deactivating the old manager and activating the new one.
        public async Task ReassignManagerAsync(int storeId, int? oldManagerId, int? newManagerId)
        {
            // Use a separate DbContext instance for each operation
            using (var deactivateContext = new LedgerLinkDbContext(_context.Database.GetDbConnection(), _auditContext))
            using (var activateContext = new LedgerLinkDbContext(_context.Database.GetDbConnection(), _auditContext))
            {
                // 1. Deactivate old manager (if exists)
                if (oldManagerId.HasValue)
                {
                    var userRepository = new UserRepository(deactivateContext);
                    await userRepository.DeactivateStoreManagerAsync(oldManagerId.Value);
                }

                // 2. Activate new manager (if exists)
                if (newManagerId.HasValue)
                {
                    var userRepository = new UserRepository(activateContext);
                    await userRepository.ActivateStoreManagerAsync(newManagerId.Value, storeId);
                }
            }
        }

        public async Task ReassignStoreManagerAsync(int newManagerId, int? previousStoreId, int? newStoreId)
        {
            // Handle the previous store
            if (previousStoreId.HasValue)
            {
                using (var previousStoreContext = new LedgerLinkDbContext(_context.Database.GetDbConnection(), _auditContext))
                {
                    var previousStore = await previousStoreContext.Stores.FirstOrDefaultAsync(s => s.StoreId == previousStoreId.Value);
                    if (previousStore != null)
                    {
                        previousStore.UserId = null; // Set the previous store's UserId to null
                        previousStoreContext.Stores.Update(previousStore);
                        await previousStoreContext.SaveChangesAsync();
                    }
                }
            }

            // Handle the new store
            using (var newStoreContext = new LedgerLinkDbContext(_context.Database.GetDbConnection(), _auditContext))
            {
                var newStore = await newStoreContext.Stores.FirstOrDefaultAsync(s => s.StoreId == newStoreId );

                if (newStore != null)
                {
                    
                    // Deactivate the previous manager
                    if (newStore.UserId != null)
                    {
                        using (var userContext = new LedgerLinkDbContext(_context.Database.GetDbConnection(), _auditContext))
                        {
                            var userRepository = new UserRepository(userContext);
                            await userRepository.DeactivateStoreManagerAsync(newStore.UserId.Value);
                        }
                    }

                    newStore.UserId = newManagerId; // Assign the new manager
                    newStoreContext.Stores.Update(newStore);
                    await newStoreContext.SaveChangesAsync();

                }
            }
        }


        public async Task<int?> GetOrganizationIdByStoreIdAsync(int storeId)
        {
            return await _context.Stores
                .Where(store => store.StoreId == storeId)
                .Select(store => store.OrgId)
                .FirstOrDefaultAsync();
        }
    }
}