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

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for report calculations (COGS, gross profit, profit margin) and placeholders for file generation.
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

        //
        // Placeholder file-generation methods
        // - These return small but valid files so clients can open them without "file corrupted" errors.
        // - Implement real generation logic (PDF/XLSX) later.
        //
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
    }
}