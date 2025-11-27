using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for report calculations (COGS, gross profit, profit margin).
    public class ReportRepository : IReportRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Constructor requires DbContext.
        public ReportRepository(LedgerLinkDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Cost of goods sold for a store in a given year/month.
        public async Task<decimal> GetCOGSByStoreForMonthAsync(int storeId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.StoreId == storeId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month)
                .SumAsync(si => (decimal?)(si.Product != null ? si.Product.CostPrice ?? 0m : 0m) * si.Quantity);

            return sum ?? 0m;
        }

        // Cost of goods sold for an organization in a given year/month.
        public async Task<decimal> GetCOGSByOrganizationForMonthAsync(int organizationId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .ThenInclude(s => s.Store)
                .Where(si => si.Sale.Store.OrgId == organizationId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month)
                .SumAsync(si => (decimal?)(si.Product != null ? si.Product.CostPrice ?? 0m : 0m) * si.Quantity);

            return sum ?? 0m;
        }

        // Gross profit for an organization = total sales - COGS.
        public async Task<decimal> GetGrossProfitByOrganizationForMonthAsync(int organizationId, int year, int month)
        {
            var totalSales = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId
                            && s.Timestamp.Year == year
                            && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var cogs = await GetCOGSByOrganizationForMonthAsync(organizationId, year, month);

            return totalSales - cogs;
        }

        // Gross profit for a store = total sales - COGS.
        public async Task<decimal> GetGrossProfitByStoreForMonthAsync(int storeId, int year, int month)
        {
            var totalSales = await _context.Sales
                .Where(s => s.StoreId == storeId
                            && s.Timestamp.Year == year
                            && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var cogs = await GetCOGSByStoreForMonthAsync(storeId, year, month);

            return totalSales - cogs;
        }

        // Profit margin for an organization = (gross profit / total sales) * 100.
        public async Task<decimal> GetProfitMarginByOrganizationForMonthAsync(int organizationId, int year, int month)
        {
            var totalSales = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId
                            && s.Timestamp.Year == year
                            && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            if (totalSales == 0m) return 0m;

            var grossProfit = await GetGrossProfitByOrganizationForMonthAsync(organizationId, year, month);
            return Math.Round(grossProfit / totalSales * 100m, 2);
        }

        // Profit margin for a store = (gross profit / total sales) * 100.
        public async Task<decimal> GetProfitMarginByStoreForMonthAsync(int storeId, int year, int month)
        {
            var totalSales = await _context.Sales
                .Where(s => s.StoreId == storeId
                            && s.Timestamp.Year == year
                            && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            if (totalSales == 0m) return 0m;

            var grossProfit = await GetGrossProfitByStoreForMonthAsync(storeId, year, month);
            return Math.Round(grossProfit / totalSales * 100m, 2);
        }
    }
}