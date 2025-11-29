using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for sale-specific queries.
    public class SaleRepository : Repository<Sale>, ISaleRepository
    {
        private readonly LedgerLinkDbContext _context;

        public SaleRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context;
        }

        // Daily totals for the current month for a store.
        public async Task<IEnumerable<DailySalesDto>> GetDailySalesForCurrentMonthAsync(int storeId)
        {
            var now = DateTime.UtcNow;
            var year = now.Year;
            var month = now.Month;

            var query = _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .GroupBy(s => s.Timestamp.Day)
                .Select(g => new DailySalesDto
                {
                    Day = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(d => d.Day);

            return await query.ToListAsync();
        }

        // Monthly totals for each month of the provided year for an organization.
        public async Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForOrganizationAsync(int organizationId, int year)
        {
            var query = _context.Sales
                .Where(s => s.Store.OrgId == organizationId && s.Timestamp.Year == year)
                .GroupBy(s => s.Timestamp.Month)
                .Select(g => new MonthlySalesDto
                {
                    Month = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(m => m.Month);

            return await query.ToListAsync();
        }

        // Monthly totals for each month of the provided year for a store.
        public async Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForStoreAsync(int storeId, int year)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year)
                .GroupBy(s => s.Timestamp.Month)
                .Select(g => new MonthlySalesDto
                {
                    Month = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(m => m.Month);

            return await query.ToListAsync();
        }

        // Sales counts and totals grouped by employee for a store.
        public async Task<IEnumerable<EmployeeSalesDto>> GetSalesCountByEmployeeAsync(int storeId)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => s.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    SalesCount = g.Count(),
                    Total = g.Sum(s => s.TotalAmount)
                });

            var results = await query.ToListAsync();

            // join with user names
            var userIds = results.Select(r => r.UserId).ToArray();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => $"{u.UserFirstname} {u.UserLastname}");

            return results.Select(r => new EmployeeSalesDto
            {
                UserId = r.UserId,
                FullName = users.TryGetValue(r.UserId, out var name) ? name : null,
                SalesCount = r.SalesCount,
                TotalAmount = r.Total
            }).ToList();
        }

        // Each store's contribution to organization sales.
        public async Task<IEnumerable<StoreSalesContributionDto>> GetStoreSalesContributionAsync(int organizationId)
        {
            var storeSums = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId)
                .GroupBy(s => new { s.StoreId, s.Store.StoreName })
                .Select(g => new
                {
                    StoreId = g.Key.StoreId,
                    StoreName = g.Key.StoreName,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .ToListAsync();

            var totalAll = storeSums.Sum(s => s.Total);

            return storeSums.Select(s => new StoreSalesContributionDto
            {
                StoreId = s.StoreId,
                StoreName = s.StoreName,
                TotalSales = s.Total,
                ContributionPercent = totalAll == 0 ? 0m : Math.Round((s.Total / totalAll) * 100m, 2)
            }).ToList();
        }

        // Sum of sales for an organization for a specific month.
        public async Task<decimal> SumSalesByMonthForOrganizationAsync(int organizationId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Sum of sales for a store for a specific month.
        public async Task<decimal> SumSalesByMonthForStoreAsync(int storeId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Sum sales for recipes in a store for a specific month (based on sale items and product selling price).
        public async Task<decimal> SumSalesByRecipeAsync(int storeId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.StoreId == storeId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month
                             && si.Product.RecipeId != null)
                .SumAsync(si => (decimal?)( (si.Product.SellingPrice ?? 0m) * si.Quantity ));

            return sum ?? 0m;
        }

        // Sum sales for recipes across organization for a specific month.
        public async Task<decimal> SumSalesByRecipeForOrganizationAsync(int organizationId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.Store.OrgId == organizationId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month
                             && si.Product.RecipeId != null)
                .SumAsync(si => (decimal?)( (si.Product.SellingPrice ?? 0m) * si.Quantity ));

            return sum ?? 0m;
        }

        // Sum sales by specific user in a store for a given month.
        public async Task<decimal> SumSalesByUserAsync(int userId, int storeId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.UserId == userId && s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Returns a lightweight list of sales for the specified store.
        public async Task<IEnumerable<SaleListDto>> GetSalesByStoreAsync(int storeId)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId)
                .Include(s => s.User)
                .Include(s => s.PaymentMethod)
                .OrderByDescending(s => s.Timestamp)
                .Select(s => new SaleListDto
                {
                    Id = s.SaleId,
                    Timestamp = s.Timestamp,
                    CreatedById = s.UserId,
                    CreatedByName = (s.User != null)
                        ? ( (s.User.UserFirstname ?? string.Empty).Trim() + " " + (s.User.UserLastname ?? string.Empty).Trim() ).Trim()
                        : null,
                    Amount = s.TotalAmount,
                    PaymentMethodId = s.PaymentMethodId,
                    // best-effort projection for payment method name; may be null depending on model
                    PaymentMethodName = s.PaymentMethod != null ? s.PaymentMethod.PaymentMethodName
                                                                  : null
                });

            return await query.ToListAsync();
        }
    }
}