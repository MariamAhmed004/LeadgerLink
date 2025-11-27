using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

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
    }
}