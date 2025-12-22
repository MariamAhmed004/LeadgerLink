using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using System;
using LeadgerLink.Server.Dtos.UserDtos;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // User repository implementing user-specific queries.
    public class UserRepository : Repository<User>, IUserRepository
    {
        private readonly LedgerLinkDbContext _context;

        public UserRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context;
        }

        // Return the user with the highest total sales for the given store.
        public async Task<User> GetTopEmployeeBySalesAsync(int storeId)
        {
            var top = await _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, Total = g.Sum(s => s.TotalAmount) })
                .OrderByDescending(x => x.Total)
                .FirstOrDefaultAsync();

            if (top == null)
                return null!;

            return await _context.Users.FindAsync(top.UserId);
        }

        // Return lightweight user list items for a store
        public async Task<IEnumerable<UserListItemDto>> GetUsersByStoreAsync(int storeId)
        {
            var q = _context.Users
                .Where(u => u.StoreId == storeId && u.IsActive)
                .OrderBy(u => u.UserFirstname)
                .Select(u => new UserListItemDto
                {
                    UserId = u.UserId,
                    FullName = ((u.UserFirstname ?? string.Empty).Trim() + " " + (u.UserLastname ?? string.Empty).Trim()).Trim(),
                    Email = u.Email
                });

            return await q.ToListAsync();
        }

        // Return projection suitable for users listing reusing UserDetailDto (fields optional)
        public async Task<IEnumerable<UserDetailDto>> GetListAsync()
        {
            var q = _context.Users
                .Select(u => new UserDetailDto
                {
                    UserId = u.UserId,
                    FullName = ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim(),
                    // new discrete fields
                    FirstName = u.UserFirstname,
                    LastName = u.UserLastname,
                    // new store name mapping (nullable)
                    StoreName = u.Store != null ? u.Store.StoreName : null,
                    Email = u.Email,
                    Phone = u.Phone,
                    Role = u.Role != null ? u.Role.RoleTitle : null,
                    OrganizationName = u.Organization != null ? u.Organization.OrgName : null,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    StoreId = u.StoreId,
                    OrgId = u.OrgId

                })
                .AsNoTracking()
                .OrderBy(u => u.FullName);

            return await q.ToListAsync();
        }

        // Return a projection suitable for the user detail page.
        public async Task<UserDetailDto?> GetDetailByIdAsync(int userId)
        {
            return await _context.Users
                .Where(u => u.UserId == userId)
                .Select(u => new UserDetailDto
                {
                    UserId = u.UserId,
                    FullName = ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim(),
                    // new discrete fields
                    FirstName = u.UserFirstname,
                    LastName = u.UserLastname,
                    // new store name mapping
                    StoreName = u.Store != null ? u.Store.StoreName : null,
                    Email = u.Email,
                    Phone = u.Phone,
                    Role = u.Role != null ? u.Role.RoleTitle : null,
                    OrganizationName = u.Organization != null ? u.Organization.OrgName : null,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    OrgId = u.OrgId,
                    StoreId = u.StoreId
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        // Deactivates a user by setting IsActive to false and clearing their StoreId.
        public async Task DeactivateStoreManagerAsync(int userId)
        {
            // Fetch the user with tracking enabled
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user != null)
            {
                // Update user properties
                user.IsActive = false;
                user.StoreId = null;
                user.UpdatedAt = DateTime.UtcNow;

                _context.Users.Attach(user);
                _context.Entry(user).Property(u => u.IsActive).IsModified = true;
                _context.Entry(user).Property(u => u.StoreId).IsModified = true;
                _context.Entry(user).Property(u => u.UpdatedAt).IsModified = true;


                // Save changes to the database
                await _context.SaveChangesAsync();
            }
        }

        // Activates a user by setting IsActive to true and assigning them to a store.
        public async Task ActivateStoreManagerAsync(int userId, int storeId)
        {
            // Fetch the user with tracking enabled
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user != null)
            {
                // Update user properties
                user.IsActive = true;
                user.StoreId = storeId;
                user.UpdatedAt = DateTime.UtcNow;

                _context.Users.Attach(user);
                _context.Entry(user).Property(u => u.IsActive).IsModified = true;
                _context.Entry(user).Property(u => u.StoreId).IsModified = true;
                _context.Entry(user).Property(u => u.UpdatedAt).IsModified = true;


                // Save changes to the database
                await _context.SaveChangesAsync();
            }
        }

        public async Task<User> GetByIdRelationAsync(int id)
        {
            return await _context.Users
                .Include(u => u.Role) // Include the Role navigation property
                .FirstOrDefaultAsync(u => u.UserId == id);
        }

    }
}