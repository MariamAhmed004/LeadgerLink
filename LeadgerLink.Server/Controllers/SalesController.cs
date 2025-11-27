using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/sales")]
    public class SalesController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;

        public SalesController(LedgerLinkDbContext context)
        {
            _context = context;
        }

        // GET api/sales/sum?organizationId=5&from=2025-11-27&to=2025-11-27
        // Returns the sum of TotalAmount for sales belonging to stores of the specified organization.
        // Optional from/to filter by date (YYYY-MM-DD). If omitted, all matching rows are summed.
        [HttpGet("sum")]
        public async Task<ActionResult<decimal>> Sum(
            [FromQuery] int organizationId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var q = _context.Sales
                .Include(s => s.Store)
                .AsQueryable();

            q = q.Where(s => s.Store != null && s.Store.OrgId == organizationId);

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(s => s.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(s => s.Timestamp <= toDate);
            }

            var sum = await q.SumAsync(s => (decimal?)s.TotalAmount);
            return Ok(sum ?? 0m);
        }

        // GET api/sales/current-store-month
        // Returns the sum of TotalAmount for sales belonging to the store of the currently authenticated user for the current month.
        [Authorize]
        [HttpGet("current-store-month")]
        public async Task<ActionResult<decimal>> SumForCurrentStoreMonth()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Ok(0m);

            var storeId = user.StoreId.Value;
            var now = DateTime.UtcNow;
            var year = now.Year;
            var month = now.Month;

            var sum = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return Ok(sum ?? 0m);
        }

        // GET api/sales/best-for-current-store
        // Returns the best selling recipe (by quantity) for the authenticated user's store.
        [Authorize]
        [HttpGet("best-for-current-store")]
        public async Task<ActionResult<BestSellingRecipeDto?>> GetBestSellingRecipeForCurrentStore()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Ok(null);

            var storeId = user.StoreId.Value;

            var top = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .Where(si => si.Sale != null
                             && si.Sale.StoreId == storeId
                             && si.Product != null
                             && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .FirstOrDefaultAsync();

            if (top == null || top.RecipeId == null)
                return Ok(null);

            var recipe = await _context.Recipes
                .Where(r => r.RecipeId == top.RecipeId)
                .Select(r => new BestSellingRecipeDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    TotalQuantity = top.TotalQty
                })
                .FirstOrDefaultAsync();

            return Ok(recipe);
        }
    }
}