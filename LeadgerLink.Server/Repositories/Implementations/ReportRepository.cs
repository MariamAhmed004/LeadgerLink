using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using System.Text;
using System.IO;
using PdfSharpCore.Pdf;
using PdfSharpCore.Drawing;
using LeadgerLink.Server.Dtos;
using System.Collections.Generic;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly LedgerLinkDbContext _context;

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

        // Dashboard / chart data implementations
        public async Task<IEnumerable<ChartPointDto>> GetTopEmployeesBySalesAsync(int storeId, int topN)
        {
            var q = await _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, Total = g.Sum(x => x.TotalAmount) })
                .OrderByDescending(x => x.Total)
                .Take(topN)
                .ToListAsync();

            var userIds = q.Select(x => x.UserId).ToList();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = users.FirstOrDefault(u => u.UserId == x.UserId)?.UserFirstname + " " + users.FirstOrDefault(u => u.UserId == x.UserId)?.UserLastname,
                Value = x.Total
            });
        }

        public async Task<TimeSeriesDto> GetStoreSalesSeriesAsync(int storeId, int months)
        {
            var end = DateTime.UtcNow;
            var start = end.AddMonths(-Math.Max(1, months) + 1);

            // group by month (YYYY-MM)
            var q = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp >= start && s.Timestamp <= end)
                .GroupBy(s => new { Year = s.Timestamp.Year, Month = s.Timestamp.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(s => s.TotalAmount) })
                .ToListAsync();

            var labels = new List<string>();
            var values = new List<decimal>();
            for (int i = 0; i < months; i++)
            {
                var dt = start.AddMonths(i);
                var found = q.FirstOrDefault(x => x.Year == dt.Year && x.Month == dt.Month);
                labels.Add(dt.ToString("yyyy-MM"));
                values.Add(found?.Total ?? 0m);
            }

            return new TimeSeriesDto { Labels = labels, Values = values };
        }

        // Organization-level aggregation
        public async Task<TimeSeriesDto> GetOrganizationSalesSeriesAsync(int organizationId, int months)
        {
            var end = DateTime.UtcNow;
            var start = end.AddMonths(-Math.Max(1, months) + 1);

            var q = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId && s.Timestamp >= start && s.Timestamp <= end)
                .GroupBy(s => new { Year = s.Timestamp.Year, Month = s.Timestamp.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(s => s.TotalAmount) })
                .ToListAsync();

            var labels = new List<string>();
            var values = new List<decimal>();
            for (int i = 0; i < months; i++)
            {
                var dt = start.AddMonths(i);
                var found = q.FirstOrDefault(x => x.Year == dt.Year && x.Month == dt.Month);
                labels.Add(dt.ToString("yyyy-MM"));
                values.Add(found?.Total ?? 0m);
            }

            return new TimeSeriesDto { Labels = labels, Values = values };
        }

        public async Task<IEnumerable<ChartPointDto>> GetItemUtilizationByOrganizationAsync(int organizationId, int topN)
        {
            var q = await _context.RecipeInventoryItems
                .Include(ri => ri.Recipe)
                .Where(ri => ri.Recipe != null && ri.Recipe.Store != null && ri.Recipe.Store.OrgId == organizationId)
                .GroupBy(ri => ri.InventoryItemId)
                .Select(g => new { InventoryItemId = g.Key, TotalQty = g.Sum(ri => ri.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .Take(topN)
                .ToListAsync();

            var itemIds = q.Select(x => x.InventoryItemId).ToList();
            var items = await _context.InventoryItems.Where(ii => itemIds.Contains(ii.InventoryItemId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = items.FirstOrDefault(ii => ii.InventoryItemId == x.InventoryItemId)?.InventoryItemName ?? ("Item " + x.InventoryItemId.ToString()),
                Value = x.TotalQty
            });
        }

        public async Task<IEnumerable<ChartPointDto>> GetInventoryByCategoryAsync(int storeId)
        {
            var q = await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId)
                .GroupBy(ii => ii.InventoryItemCategoryId)
                .Select(g => new { CategoryId = g.Key, TotalQty = g.Sum(ii => ii.Quantity) })
                .ToListAsync();

            var categoryIds = q.Select(x => x.CategoryId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var cats = await _context.InventoryItemCategories.Where(c => categoryIds.Contains(c.InventoryItemCategoryId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = cats.FirstOrDefault(c => c.InventoryItemCategoryId == x.CategoryId)?.InventoryItemCategoryName ?? ("Category " + x.CategoryId?.ToString()),
                Value = x.TotalQty
            });
        }

        // Store-level implementations missing previously
        public async Task<IEnumerable<ChartPointDto>> GetItemUtilizationAsync(int storeId, int topN)
        {
            var q = await _context.RecipeInventoryItems
                .Include(ri => ri.Recipe)
                .Where(ri => ri.Recipe != null && ri.Recipe.StoreId == storeId)
                .GroupBy(ri => ri.InventoryItemId)
                .Select(g => new { InventoryItemId = g.Key, TotalQty = g.Sum(ri => ri.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .Take(topN)
                .ToListAsync();

            var itemIds = q.Select(x => x.InventoryItemId).ToList();
            var items = await _context.InventoryItems.Where(ii => itemIds.Contains(ii.InventoryItemId) && ii.StoreId == storeId).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = items.FirstOrDefault(ii => ii.InventoryItemId == x.InventoryItemId)?.InventoryItemName ?? ("Item " + x.InventoryItemId.ToString()),
                Value = x.TotalQty
            });
        }

        public async Task<TransferCountsDto> GetInventoryTransferCountsAsync(int storeId, DateTime from, DateTime to)
        {
            var outgoing = await _context.InventoryTransfers
                .Where(t => t.FromStoreNavigation != null && t.FromStoreNavigation.StoreId == storeId && (from == DateTime.MinValue || (t.RequestedAt >= from && t.RequestedAt <= to)))
                .CountAsync();

            var incoming = await _context.InventoryTransfers
                .Where(t => t.ToStoreNavigation != null && t.ToStoreNavigation.StoreId == storeId && (from == DateTime.MinValue || (t.RequestedAt >= from && t.RequestedAt <= to)))
                .CountAsync();

            return new TransferCountsDto { Outgoing = outgoing, Incoming = incoming };
        }

        public async Task<IEnumerable<ChartPointDto>> GetTopProductsBySalesAsync(int storeId, int topN)
        {
            var q = await _context.SaleItems
                .Include(si => si.Sale)
                .Where(si => si.Sale.StoreId == storeId)
                .GroupBy(si => si.ProductId)
                .Select(g => new { ProductId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .Take(topN)
                .ToListAsync();

            var productIds = q.Select(x => x.ProductId).ToList();
            var products = await _context.Products.Where(p => productIds.Contains(p.ProductId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = products.FirstOrDefault(p => p.ProductId == x.ProductId)?.ProductName ?? ("Product " + x.ProductId.ToString()),
                Value = x.TotalQty
            });
        }

        public async Task<IEnumerable<ChartPointDto>> GetInventoryByCategoryForOrganizationAsync(int organizationId)
        {
            var q = await _context.InventoryItems
                .Where(ii => ii.Store != null && ii.Store.OrgId == organizationId)
                .GroupBy(ii => ii.InventoryItemCategoryId)
                .Select(g => new { CategoryId = g.Key, TotalQty = g.Sum(ii => ii.Quantity) })
                .ToListAsync();

            var categoryIds = q.Select(x => x.CategoryId).Where(id => id.HasValue).Select(id => id!.Value).ToList();
            var cats = await _context.InventoryItemCategories.Where(c => categoryIds.Contains(c.InventoryItemCategoryId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = cats.FirstOrDefault(c => c.InventoryItemCategoryId == x.CategoryId)?.InventoryItemCategoryName ?? ("Category " + x.CategoryId?.ToString()),
                Value = x.TotalQty
            });
        }

        public async Task<TransferCountsDto> GetInventoryTransferCountsForOrganizationAsync(int organizationId, DateTime from, DateTime to)
        {
            var outgoing = await _context.InventoryTransfers
                .Where(t => t.FromStoreNavigation.OrgId == organizationId && (from == DateTime.MinValue || (t.RequestedAt >= from && t.RequestedAt <= to)))
                .CountAsync();

            var incoming = await _context.InventoryTransfers
                .Where(t => t.ToStoreNavigation.OrgId == organizationId && (from == DateTime.MinValue || (t.RequestedAt >= from && t.RequestedAt <= to)))
                .CountAsync();

            return new TransferCountsDto { Outgoing = outgoing, Incoming = incoming };
        }

        public async Task<IEnumerable<ChartPointDto>> GetTopProductsBySalesForOrganizationAsync(int organizationId, int topN)
        {
            var q = await _context.SaleItems
                .Include(si => si.Sale)
                .ThenInclude(s => s.Store)
                .Where(si => si.Sale.Store.OrgId == organizationId)
                .GroupBy(si => si.ProductId)
                .Select(g => new { ProductId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .Take(topN)
                .ToListAsync();

            var productIds = q.Select(x => x.ProductId).ToList();
            var products = await _context.Products.Where(p => productIds.Contains(p.ProductId)).ToListAsync();

            return q.Select(x => new ChartPointDto
            {
                Name = products.FirstOrDefault(p => p.ProductId == x.ProductId)?.ProductName ?? ("Product " + x.ProductId.ToString()),
                Value = x.TotalQty
            });
        }

        // -------------------------
        // File generation placeholders (unchanged)
        // -------------------------
        public Task<byte[]> GenerateReportPdfAsync(string reportId, int? organizationId = null, int? storeId = null)
        {
            using var ms = new MemoryStream();

            // Create PDF document
            using (var document = new PdfDocument())
            {
                var page = document.AddPage();
                page.Size = PdfSharpCore.PageSize.A4;
                page.Orientation = PdfSharpCore.PageOrientation.Portrait;

                using (var gfx = XGraphics.FromPdfPage(page))
                {
                    // Note: font names rely on system fonts. If fonts are missing on the host, consider bundling a resolver.
                    var titleFont = new XFont("Arial", 16, XFontStyle.Bold);
                    var smallFont = new XFont("Arial", 10, XFontStyle.Regular);
                    gfx.DrawString($"Report: {reportId}", titleFont, XBrushes.Black, new XRect(40, 40, page.Width.Point - 80, 30), XStringFormats.TopLeft);
                    gfx.DrawString($"Organization: {organizationId?.ToString() ?? "N/A"}, Store: {storeId?.ToString() ?? "N/A"}", smallFont, XBrushes.Gray, new XRect(40, 80, page.Width.Point - 80, 20), XStringFormats.TopLeft);
                    gfx.DrawString("This is a placeholder PDF generated with PdfSharpCore.", smallFont, XBrushes.Black, new XRect(40, 110, page.Width.Point - 80, 200), XStringFormats.TopLeft);
                }

                document.Save(ms);
            }

            return Task.FromResult(ms.ToArray());
        }

        public Task<byte[]> GenerateReportCsvAsync(string reportId, int? organizationId = null, int? storeId = null)
        {
            // Return a tiny UTF-8 CSV with BOM and a single newline so Excel/LibreOffice will open it cleanly.
            var bom = new byte[] { 0xEF, 0xBB, 0xBF }; // UTF-8 BOM
            var content = Encoding.UTF8.GetBytes("\n");
            var result = new byte[bom.Length + content.Length];
            Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
            Buffer.BlockCopy(content, 0, result, bom.Length, content.Length);
            return Task.FromResult(result);
        }

        public async Task<IEnumerable<ChartPointDto>> GetStoreSalesContributionForOrganizationAsync(int organizationId, DateTime from, DateTime to)
        {
            var q = await _context.Sales
                .Include(s => s.Store)
                .Where(s => s.Store != null
                            && s.Store.OrgId == organizationId
                            && s.Timestamp >= from
                            && s.Timestamp <= to)
                .GroupBy(s => s.StoreId)
                .Select(g => new { StoreId = g.Key, Total = g.Sum(x => x.TotalAmount) })
                .ToListAsync();

            // Fetch all org stores once; avoids nullable/int Contains mismatches
            var stores = await _context.Stores
                .Where(st => st.OrgId == organizationId)
                .Select(st => new { st.StoreId, st.StoreName })
                .ToListAsync();

            return q.Select(x =>
            {
                var storeName = stores.FirstOrDefault(st => st.StoreId == x.StoreId)?.StoreName ?? $"Store {x.StoreId}";
                return new ChartPointDto
                {
                    Name = storeName,
                    Value = x.Total
                };
            });
        }
    }
}