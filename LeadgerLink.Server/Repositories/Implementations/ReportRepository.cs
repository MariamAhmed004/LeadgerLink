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
using ClosedXML.Excel;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IInventoryItemRepository _inventoryRepo;

        public ReportRepository(LedgerLinkDbContext context, IInventoryItemRepository inventoryRepo)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _inventoryRepo = inventoryRepo ?? throw new ArgumentNullException(nameof(inventoryRepo));
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

        // -------------------------
        // Current Stock Report (PDF/CSV)
        // -------------------------
        private static (XFont title, XFont header, XFont text, XPen gridPen, XBrush headerBrush) CreatePdfStyle()
        {
            var title = new XFont("Arial", 16, XFontStyle.Bold);
            var header = new XFont("Arial", 11, XFontStyle.Bold);
            var text = new XFont("Arial", 10, XFontStyle.Regular);
            var gridPen = new XPen(XColors.LightGray, 0.5);
            var headerBrush = new XSolidBrush(XColor.FromArgb(0xEE, 0xF2, 0xFB)); // light blue
            return (title, header, text, gridPen, headerBrush);
        }

        private static void DrawSectionHeader(XGraphics gfx, string title, XFont font, double x, ref double y, double width, XBrush? bg = null)
        {
            var rect = new XRect(x, y, width, 22);
            if (bg != null) gfx.DrawRectangle(bg, rect);
            gfx.DrawString(title, font, XBrushes.Black, rect, XStringFormats.CenterLeft);
            y += 26;
        }

        private static void DrawTableHeader(XGraphics gfx, string[] columns, XFont font, double x, ref double y, double[] widths, XBrush bg, XPen border)
        {
            var height = 20;
            var xx = x;
            for (int i = 0; i < columns.Length; i++)
            {
                var rect = new XRect(xx, y, widths[i], height);
                gfx.DrawRectangle(bg, rect);
                gfx.DrawRectangle(border, rect);
                gfx.DrawString(columns[i], font, XBrushes.Black, rect, XStringFormats.CenterLeft);
                xx += widths[i];
            }
            y += height + 4;
        }

        private static void DrawTableRow(XGraphics gfx, string[] cells, XFont font, double x, ref double y, double[] widths, XPen border, XBrush? brushOverride = null)
        {
            var height = 18;
            var xx = x;
            for (int i = 0; i < cells.Length; i++)
            {
                var rect = new XRect(xx, y, widths[i], height);
                if (brushOverride != null) gfx.DrawRectangle(brushOverride, rect);
                gfx.DrawRectangle(border, rect);
                gfx.DrawString(cells[i], font, XBrushes.Black, rect, XStringFormats.CenterLeft);
                xx += widths[i];
            }
            y += height;
        }

        public async Task<byte[]> GenerateCurrentStockReportPdfAsync(int storeId)
        {
            var store = await _context.Stores.Include(s => s.InventoryItems).ThenInclude(ii => ii.InventoryItemCategory)
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;
            var lowStockCount = await _inventoryRepo.CountLowStockItemsByStoreAsync(storeId);
            var storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(storeId);
            var allItems = await _inventoryRepo.GetItemsByStoreAsync(storeId);
            var totalItems = allItems.Count();
            var lowStockItems = allItems.Where(ii => ii.MinimumQuantity.HasValue && ii.Quantity < ii.MinimumQuantity.Value).ToList();

            using var ms = new MemoryStream();
            using (var document = new PdfDocument())
            {
                var page = document.AddPage();
                page.Size = PdfSharpCore.PageSize.A4;
                page.Orientation = PdfSharpCore.PageOrientation.Portrait;
                var gfx = XGraphics.FromPdfPage(page);

                var (titleFont, headerFont, textFont, gridPen, headerBg) = CreatePdfStyle();

                double x = 36;
                double y = 36;
                double contentWidth = page.Width.Point - (x * 2);

                // Report title block
                DrawSectionHeader(gfx, "Current Stock Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store: {storeName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Low stock items: {lowStockCount}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Total items: {totalItems}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store inventory value: BHD {storeValue:F3}", textFont, x, ref y, contentWidth);

                y += 6;

                // All items table
                DrawSectionHeader(gfx, "All Inventory Items", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.5, contentWidth * 0.3, contentWidth * 0.2 };
                DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var ii in allItems)
                {
                    var cat = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : "-";
                    var cells = new[] { ii.InventoryItemName ?? "-", cat, $"{ii.Quantity:F3}" };
                    DrawTableRow(gfx, cells, textFont, x, ref y, widths, gridPen);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                y += 10;

                // Low stock table with highlight rows
                DrawSectionHeader(gfx, "Low Stock Items", headerFont, x, ref y, contentWidth, headerBg);
                var lWidths = new[] { contentWidth * 0.45, contentWidth * 0.25, contentWidth * 0.15, contentWidth * 0.15 };
                DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity", "Minimum" }, headerFont, x, ref y, lWidths, headerBg, gridPen);

                var lowRowBg = new XSolidBrush(XColor.FromArgb(0xFF, 0xF5, 0xF5)); // light red-ish
                foreach (var ii in lowStockItems)
                {
                    var cat = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : "-";
                    var min = ii.MinimumQuantity.HasValue ? ii.MinimumQuantity.Value.ToString() : "-";
                    var cells = new[] { ii.InventoryItemName ?? "-", cat, $"{ii.Quantity:F3}", min };
                    DrawTableRow(gfx, cells, textFont, x, ref y, lWidths, gridPen, lowRowBg);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity", "Minimum" }, headerFont, x, ref y, lWidths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateCurrentStockReportCsvAsync(int storeId)
        {
            var store = await _context.Stores.Include(s => s.InventoryItems).ThenInclude(ii => ii.InventoryItemCategory)
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC";
            var lowStockCount = await _inventoryRepo.CountLowStockItemsByStoreAsync(storeId);
            var storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(storeId);
            var allItems = await _inventoryRepo.GetItemsByStoreAsync(storeId);
            var totalItems = allItems.Count();

            // CSV cannot control column widths or text styling; keep consistent headers for reuse across tools.
            var sb = new StringBuilder();
            sb.AppendLine("Current Stock Report");
            sb.AppendLine($"Store,{EscapeCsv(storeName)}");
            sb.AppendLine($"Generated,{generatedAt}");
            sb.AppendLine($"LowStockCount,{lowStockCount}");
            sb.AppendLine($"TotalItems,{totalItems}");
            sb.AppendLine($"StoreInventoryValue,BHD {storeValue:F3}");
            sb.AppendLine();

            sb.AppendLine("All Inventory Items");
            sb.AppendLine("Item Name,Category,Quantity");
            foreach (var ii in allItems)
            {
                var cat = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : "-";
                sb.AppendLine($"{EscapeCsv(ii.InventoryItemName)},{EscapeCsv(cat)},{ii.Quantity:F3}");
            }
            sb.AppendLine();

            sb.AppendLine("Low Stock Items");
            sb.AppendLine("Item Name,Category,Quantity,Minimum");
            foreach (var ii in allItems.Where(x => x.MinimumQuantity.HasValue && x.Quantity < x.MinimumQuantity.Value))
            {
                var cat = ii.InventoryItemCategory != null ? ii.InventoryItemCategory.InventoryItemCategoryName : "-";
                var min = ii.MinimumQuantity.HasValue ? ii.MinimumQuantity.Value.ToString() : "-";
                sb.AppendLine($"{EscapeCsv(ii.InventoryItemName)},{EscapeCsv(cat)},{ii.Quantity:F3},{min}");
            }

            var bom = new byte[] { 0xEF, 0xBB, 0xBF };
            var content = Encoding.UTF8.GetBytes(sb.ToString());
            var result = new byte[bom.Length + content.Length];
            Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
            Buffer.BlockCopy(content, 0, result, bom.Length, content.Length);
            return result;
        }

        private static string EscapeCsv(string? s)
        {
            var v = s ?? string.Empty;
            if (v.Contains('"') || v.Contains(',') || v.Contains('\n'))
            {
                v = '"' + v.Replace("\"", "\"\"") + '"';
            }
            return v;
        }

        private static XLWorkbook CreateWorkbook()
        {
            var wb = new XLWorkbook();
            wb.Style.Font.FontName = "Segoe UI";
            wb.Style.Font.FontSize = 11;
            return wb;
        }

        private static IXLWorksheet AddStyledTable(IXLWorkbook wb, string sheetName, string title,
            string[] headers, IEnumerable<string[]> rows, Action<IXLRange>? extraStyle = null,
            double[]? columnWidths = null)
        {
            var ws = wb.Worksheets.Add(sheetName);
            int r = 1;

            // Title
            ws.Cell(r, 1).Value = title;
            ws.Range(r, 1, r, headers.Length).Merge().Style
                .Font.SetBold()
                .Font.SetFontSize(14)
                .Fill.SetBackgroundColor(XLColor.LightBlue)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);
            r += 2;

            // Header row
            for (int c = 0; c < headers.Length; c++)
                ws.Cell(r, c + 1).Value = headers[c];

            var headerRange = ws.Range(r, 1, r, headers.Length);
            headerRange.Style.Font.SetBold();
            headerRange.Style.Fill.SetBackgroundColor(XLColor.LightGray);
            headerRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            r++;

            // Materialize data to avoid deferred execution issues
            var materializedRows = rows as IList<string[]> ?? rows.ToList();

            // Data rows
            foreach (var row in materializedRows)
            {
                for (int c = 0; c < headers.Length && c < row.Length; c++)
                    ws.Cell(r, c + 1).Value = row[c];
                r++;
            }

            // Style only the actually used range
            var lastRow = Math.Max(r - 1, 1);
            var dataRange = ws.Range(1, 1, lastRow, headers.Length);
            dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            dataRange.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Center);

            // Column widths
            if (columnWidths != null && columnWidths.Length == headers.Length)
            {
                for (int c = 0; c < headers.Length; c++)
                    ws.Column(c + 1).Width = columnWidths[c];
            }
            else
            {
                ws.Columns(1, headers.Length).AdjustToContents();
            }

            // Optional extra styling (e.g., highlight). Limit to used cells only
            extraStyle?.Invoke(ws.Range(1, 1, lastRow, headers.Length));

            // Do not freeze panes to avoid sticky rows while scrolling
            return ws;
        }

        private static int AddStyledTableAt(IXLWorksheet ws, int startRow, string title,
            string[] headers, IList<string[]> rows, double[]? columnWidths = null, Action<IXLRange>? extraStyle = null)
        {
            var r = startRow;

            // Title
            ws.Cell(r, 1).Value = title;
            ws.Range(r, 1, r, headers.Length).Merge().Style
                .Font.SetBold()
                .Font.SetFontSize(14)
                .Fill.SetBackgroundColor(XLColor.LightBlue)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left);
            r += 2; // keep one blank row between title and header

            // Header row
            for (int c = 0; c < headers.Length; c++)
                ws.Cell(r, c + 1).Value = headers[c];

            var headerRange = ws.Range(r, 1, r, headers.Length);
            headerRange.Style.Font.SetBold();
            headerRange.Style.Fill.SetBackgroundColor(XLColor.LightGray);
            headerRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            r++;

            // Data rows (already materialized)
            foreach (var row in rows)
            {
                for (int c = 0; c < headers.Length && c < row.Length; c++)
                    ws.Cell(r, c + 1).Value = row[c];
                r++;
            }

            // Style only the actually used range
            var lastRow = Math.Max(r - 1, startRow);
            var usedRange = ws.Range(startRow, 1, lastRow, headers.Length);
            usedRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            usedRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            usedRange.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Center);

            // Column widths per section
            if (columnWidths != null && columnWidths.Length == headers.Length)
            {
                for (int c = 0; c < headers.Length; c++)
                    ws.Column(c + 1).Width = columnWidths[c];
            }
            else
            {
                ws.Columns(1, headers.Length).AdjustToContents(startRow, lastRow);
            }

            // Optional extra styling (limit to used cells only)
            extraStyle?.Invoke(usedRange);

            // Return next row index after a spacer row for the next section
            return lastRow + 2; // one blank row distance between sections
        }

        public async Task<byte[]> GenerateCurrentStockReportExcelAsync(int storeId)
        {
            var store = await _context.Stores.Include(s => s.InventoryItems).ThenInclude(ii => ii.InventoryItemCategory)
                .FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;
            var lowStockCount = await _inventoryRepo.CountLowStockItemsByStoreAsync(storeId);
            var storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(storeId);
            var allItems = await _inventoryRepo.GetItemsByStoreAsync(storeId);
            var totalItems = allItems.Count();
            var lowStockItems = allItems.Where(ii => ii.MinimumQuantity.HasValue && ii.Quantity < ii.MinimumQuantity.Value).ToList();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Current Stock");
            int row = 1;

            // Summary block
            var summaryHeaders = new[] { "Store", "Generated (UTC)", "Low Stock Items", "Total Items", "Inventory Value (BHD)" };
            var summaryRows = new List<string[]> {
                new [] { storeName, generatedAt.ToString("yyyy-MM-dd HH:mm"), lowStockCount.ToString(), totalItems.ToString(), storeValue.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Current Stock Report", summaryHeaders, summaryRows, new[] { 35d, 24d, 20d, 18d, 22d });

            // All items block
            var allHeaders = new[] { "Item Name", "Category", "Quantity" };
            var allRows = allItems.Select(ii => new[]
            {
                ii.InventoryItemName ?? "-",
                ii.InventoryItemCategory?.InventoryItemCategoryName ?? "-",
                ii.Quantity.ToString("F3")
            }).ToList();
            row = AddStyledTableAt(ws, row, "All Inventory Items", allHeaders, allRows, new[] { 45d, 30d, 18d });

            // Low stock block (highlight rows)
            var lowHeaders = new[] { "Item Name", "Category", "Quantity", "Minimum" };
            var lowRows = lowStockItems.Select(ii => new[]
            {
                ii.InventoryItemName ?? "-",
                ii.InventoryItemCategory?.InventoryItemCategoryName ?? "-",
                ii.Quantity.ToString("F3"),
                ii.MinimumQuantity?.ToString() ?? "-"
            }).ToList();
            row = AddStyledTableAt(ws, row, "Low Stock Items", lowHeaders, lowRows, new[] { 45d, 30d, 18d, 18d }, usedRange =>
            {
                var lastRow = usedRange.RangeAddress.LastAddress.RowNumber;
                // data region starts after title(1) + blank(1) + header(1) => +3 rows from section start
                var dataStart = usedRange.RangeAddress.FirstAddress.RowNumber + 3;
                if (lastRow >= dataStart)
                {
                    var dataOnly = ws.Range(dataStart, 1, lastRow, lowHeaders.Length);
                    dataOnly.Style.Fill.SetBackgroundColor(XLColor.PalePink);
                }
            });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }
    }
}