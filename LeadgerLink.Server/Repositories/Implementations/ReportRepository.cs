using ClosedXML.Excel;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Services;
using Microsoft.EntityFrameworkCore;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using PdfSharpCore.Drawing.Layout;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class ReportRepository : IReportRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IInventoryItemRepository _inventoryRepo;
        private readonly GeminiChatService _geminiService;


        public ReportRepository(LedgerLinkDbContext context, IInventoryItemRepository inventoryRepo, GeminiChatService geminiChatService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _inventoryRepo = inventoryRepo ?? throw new ArgumentNullException(nameof(inventoryRepo));
            _geminiService = geminiChatService ?? throw new ArgumentNullException(nameof(geminiChatService));
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
            // "Completed" = Delivered, "Pending" = any other status
            var transfers = _context.InventoryTransfers.Include(t => t.InventoryTransferStatus)
                .Where(t =>
                    (t.FromStoreNavigation.OrgId == organizationId || t.ToStoreNavigation.OrgId == organizationId) &&
                    (from == DateTime.MinValue || (t.RequestedAt >= from && t.RequestedAt <= to))
                );

            var completed = await transfers.CountAsync(t => t.InventoryTransferStatus.TransferStatus == "delivered");
            var pending = await transfers.CountAsync(t => t.InventoryTransferStatus.TransferStatus != "delivered");

            return new TransferCountsDto { Pending = pending, Completed = completed };
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

        private static double MeasureWrappedHeight(XGraphics gfx, string? text, XFont font, double maxWidth, double lineSpacing = 2)
        {
            if (string.IsNullOrWhiteSpace(text))
                return font.Height;

            var lines = text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            double totalHeight = 0;
            foreach (var rawLine in lines)
            {
                if (string.IsNullOrEmpty(rawLine))
                {
                    totalHeight += font.Height + lineSpacing;
                    continue;
                }

                var words = rawLine.Split(' ');
                var lineBuilder = new StringBuilder();
                int lineCountForParagraph = 0;

                foreach (var word in words)
                {
                    var test = lineBuilder.Length == 0 ? word : lineBuilder + " " + word;
                    var size = gfx.MeasureString(test, font);
                    if (size.Width > maxWidth)
                    {
                        // we need to wrap before this word
                        lineCountForParagraph++;
                        lineBuilder.Clear();
                        lineBuilder.Append(word);
                    }
                    else
                    {
                        lineBuilder.Clear();
                        lineBuilder.Append(test);
                    }
                }

                if (lineBuilder.Length > 0) lineCountForParagraph++;

                // paragraph height
                totalHeight += lineCountForParagraph * font.Height + Math.Max(0, (lineCountForParagraph - 1)) * lineSpacing;
                // respect explicit paragraph break spacing
                totalHeight += lineSpacing;
            }

            return Math.Max(font.Height, totalHeight);
        }

        private static void DrawWrappedTextInCell(XGraphics gfx, string? text, XFont font, XBrush brush,
                                                  double x, double y, double maxWidth, double lineSpacing = 2)
        {
            if (string.IsNullOrEmpty(text))
                return;

            var lines = text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            double currentY = y;

            foreach (var rawLine in lines)
            {
                var words = rawLine.Split(' ');
                var line = new StringBuilder();

                foreach (var word in words)
                {
                    string testLine = line.Length == 0 ? word : line + " " + word;
                    var size = gfx.MeasureString(testLine, font);

                    if (size.Width > maxWidth)
                    {
                        if (line.Length > 0)
                        {
                            gfx.DrawString(line.ToString(), font, brush,
                                new XRect(x, currentY, maxWidth, font.Height), XStringFormats.TopLeft);
                            currentY += font.Height + lineSpacing;
                        }

                        line.Clear();
                        line.Append(word);
                    }
                    else
                    {
                        line.Clear();
                        line.Append(testLine);
                    }
                }

                if (line.Length > 0)
                {
                    gfx.DrawString(line.ToString(), font, brush,
                        new XRect(x, currentY, maxWidth, font.Height), XStringFormats.TopLeft);
                    currentY += font.Height + lineSpacing;
                }
                else
                {
                    currentY += font.Height + lineSpacing;
                }
            }
        }

        private static void DrawTableRow(XGraphics gfx, string[] cells, XFont font, double x, ref double y, double[] widths, XPen border, XBrush? brushOverride = null)
        {
            const double cellPadding = 6.0;
            const double lineSpacing = 2.0;
            // compute required height per cell
            var heights = new double[cells.Length];
            for (int i = 0; i < cells.Length; i++)
            {
                var maxTextWidth = Math.Max(10, widths[i] - (cellPadding * 2));
                heights[i] = MeasureWrappedHeight(gfx, cells[i], font, maxTextWidth, lineSpacing) + (cellPadding * 2);
            }

            var rowHeight = Math.Max(18, heights.Max());

            // draw each cell (background, border, then wrapped text)
            var xx = x;
            for (int i = 0; i < cells.Length; i++)
            {
                var rect = new XRect(xx, y, widths[i], rowHeight);
                if (brushOverride != null) gfx.DrawRectangle(brushOverride, rect);
                gfx.DrawRectangle(border, rect);

                // draw wrapped text inside the cell with padding
                var textX = xx + cellPadding;
                var textY = y + cellPadding / 2;
                var textWidth = Math.Max(10, widths[i] - (cellPadding * 2));
                DrawWrappedTextInCell(gfx, cells[i] ?? string.Empty, font, XBrushes.Black, textX, textY, textWidth, lineSpacing);

                xx += widths[i];
            }

            // advance y by the row height plus a small gap
            y += rowHeight + 2;
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

            // Enable text wrap for data cells so long text (e.g. AI recommendations) wraps
            dataRange.Style.Alignment.WrapText = true;

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

            // Enable wrap text for the whole used range so long cells (AI recommendations) wrap
            usedRange.Style.Alignment.WrapText = true;

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

        public async Task<byte[]> GenerateTopRecipesSalesReportPdfAsync(int storeId)
        {
            // Fetch store, recipes and sales aggregates via context
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            // Aggregate recipe sales for the store
            var recipeSales = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.StoreId == storeId && si.Product != null && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new {
                    RecipeId = g.Key,
                    TotalQty = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m)),
                    RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault()
                })
                .OrderByDescending(x => x.TotalQty)
                .ToListAsync();

            var mostSelling = recipeSales.FirstOrDefault();
            var mostSellingName = mostSelling?.RecipeName ?? "-";
            var mostSellingCount = mostSelling?.TotalQty ?? 0m;
            var totalRevenue = recipeSales.Sum(x => x.TotalRevenue);

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

                // Header
                DrawSectionHeader(gfx, "Top Recipes & Sales", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store: {storeName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Most Selling Recipe: {mostSellingName}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Times Sold: {mostSellingCount}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store Revenue: BHD {totalRevenue:F3}", textFont, x, ref y, contentWidth);

                y += 6;

                // Table: All recipes and quantities
                DrawSectionHeader(gfx, "Recipe Sales", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.6, contentWidth * 0.2, contentWidth * 0.2 };
                DrawTableHeader(gfx, new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var r in recipeSales)
                {
                    var cells = new[] { r.RecipeName ?? ("Recipe #" + r.RecipeId), r.TotalQty.ToString("F3"), r.TotalRevenue.ToString("F3") };
                    DrawTableRow(gfx, cells, textFont, x, ref y, widths, gridPen);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateTopEmployeeReportPdfAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            // All employees in the store
            var employees = await _context.Users
                .Where(u => u.StoreId == storeId)
                .Select(u => new
                {
                    u.UserId,
                    FullName = ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim()
                })
                .ToListAsync();

            // Aggregate employee sales (by user) for the store
            var salesAgg = await _context.Sales
                .Where(s => s.StoreId == storeId && s.UserId != null)
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, TotalSales = g.Sum(x => x.TotalAmount) })
                .ToListAsync();

            // Left-join employees with sales to include zero-sales users
            var employeeSales = employees
                .Select(e => new
                {
                    e.UserId,
                    e.FullName,
                    TotalSales = salesAgg.FirstOrDefault(x => x.UserId == e.UserId)?.TotalSales ?? 0m
                })
                .OrderByDescending(x => x.TotalSales)
                .ToList();

            var top = employeeSales.FirstOrDefault();
            var topName = top?.FullName ?? "-";
            var topAmount = top?.TotalSales ?? 0m;

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

                // Header
                DrawSectionHeader(gfx, "Top Employee Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store: {storeName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Top Employee: {topName}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Total Sales: BHD {topAmount:F3}", textFont, x, ref y, contentWidth);

                y += 6;

                // Table: All employees sales
                DrawSectionHeader(gfx, "Store Employee Sales", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.6, contentWidth * 0.4 };
                DrawTableHeader(gfx, new[] { "Employee Name", "Total Sales (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var e in employeeSales)
                {
                    var name = string.IsNullOrWhiteSpace(e.FullName) ? ("User #" + e.UserId) : e.FullName;
                    var cells = new[] { name, e.TotalSales.ToString("F3") };
                    DrawTableRow(gfx, cells, textFont, x, ref y, widths, gridPen);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Employee Name", "Total Sales (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateSalesSummaryReportPdfAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;
            var today = DateTime.UtcNow.Date;

            // Daily counts and totals
            var todaysSales = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Date == today)
                .ToListAsync();
            var salesCountToday = todaysSales.Count;
            var revenueToday = todaysSales.Sum(s => s.TotalAmount);
            var cogsToday = await GetCOGSByStoreForMonthAsync(storeId, today.Year, today.Month); // approximate monthly COGS; adjust if per-day COGS exists

            // Group sales by month for the store
            var monthlySales = await _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => new { s.Timestamp.Year, s.Timestamp.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(x => x.TotalAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

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

                // Header
                DrawSectionHeader(gfx, "Sales Summary", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store: {storeName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Sales Records Today: {salesCountToday}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Revenue Today: BHD {revenueToday:F3}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"COGS (Month): BHD {cogsToday:F3}", textFont, x, ref y, contentWidth);

                y += 6;

                // Table: Sales grouped by month
                DrawSectionHeader(gfx, "Monthly Sales Totals", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.5, contentWidth * 0.5 };
                DrawTableHeader(gfx, new[] { "Month", "Total Sales (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var m in monthlySales)
                {
                    var monthLabel = new DateTime(m.Year, m.Month, 1).ToString("yyyy-MM");
                    var cells = new[] { monthLabel, m.Total.ToString("F3") };
                    DrawTableRow(gfx, cells, textFont, x, ref y, widths, gridPen);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Month", "Total Sales (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateInventoryUsageTrendsReportPdfAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            // Utilization entries for the store
            var utilizationEntries = await _context.RecipeInventoryItems
                .Include(ri => ri.Recipe)
                .Where(ri => ri.Recipe != null && ri.Recipe.StoreId == storeId)
                .ToListAsync();

            // Aggregated utilization by inventory item
            var utilization = utilizationEntries
                .GroupBy(ri => ri.InventoryItemId)
                .Select(g => new { InventoryItemId = g.Key, UtilizedQty = g.Sum(x => x.Quantity) })
                .ToList();

            var itemIds = utilization.Select(u => u.InventoryItemId).ToList();
            var items = await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId && itemIds.Contains(ii.InventoryItemId))
                .Select(ii => new { ii.InventoryItemId, ii.InventoryItemName })
                .ToListAsync();

            // Aggregate sold quantities per recipe used at this store
            var salesByRecipe = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.StoreId == storeId && si.Product != null && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId!.Value)
                .Select(g => new { RecipeId = g.Key, SoldQty = g.Sum(x => x.Quantity) })
                .ToListAsync();

            // Build map inventoryItemId -> set of recipeIds that include it
            var recipeIdsByItem = utilizationEntries
                .GroupBy(ri => ri.InventoryItemId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.RecipeId).Distinct().ToList()
                );

            var rowsData = items
                .Select(i => new
                {
                    Name = string.IsNullOrWhiteSpace(i.InventoryItemName) ? ($"Item #{i.InventoryItemId}") : i.InventoryItemName!,
                    UtilizedQty = utilization.FirstOrDefault(u => u.InventoryItemId == i.InventoryItemId)?.UtilizedQty ?? 0m,
                    SoldQty = (recipeIdsByItem.TryGetValue(i.InventoryItemId, out var rids)
                        ? salesByRecipe.Where(s => rids.Contains(s.RecipeId)).Sum(s => s.SoldQty)
                        : 0m)
                })
                .OrderByDescending(x => x.UtilizedQty)
                .ToList();

            var mostUtilized = rowsData.FirstOrDefault();
            var mostUtilizedName = mostUtilized?.Name ?? "-";

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

                // Header
                DrawSectionHeader(gfx, "Inventory Usage Trends", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Store: {storeName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Most Utilized Item: {mostUtilizedName}", textFont, x, ref y, contentWidth);

                y += 6;

                // Table: Item utilization and product sales
                DrawSectionHeader(gfx, "Inventory Utilization & Sales", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.6, contentWidth * 0.2, contentWidth * 0.2 };
                DrawTableHeader(gfx, new[] { "Inventory Item", "Utilized in Recipes (Qty)", "Sold as Product (Qty)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var r in rowsData)
                {
                    var name = r.Name ?? "-";
                    string[] cells = new[] { name, r.UtilizedQty.ToString("F3"), r.SoldQty.ToString("F3") };
                    DrawTableRow(gfx, cells, textFont, x, ref y, widths, gridPen);
                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Inventory Item", "Utilized in Recipes (Qty)", "Sold as Product (Qty)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateTopRecipesSalesReportExcelAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            var recipeSales = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.StoreId == storeId && si.Product != null && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new {
                    RecipeId = g.Key,
                    TotalQty = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m)),
                    RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault()
                })
                .OrderByDescending(x => x.TotalQty)
                .ToListAsync();

            var mostSelling = recipeSales.FirstOrDefault();
            var topName = mostSelling?.RecipeName ?? "-";
            var topAmount = mostSelling?.TotalQty ?? 0m;
            var totalRevenue = recipeSales.Sum(x => x.TotalRevenue);

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Top Recipes & Sales");

            int row = 1;
            var summaryHeaders = new[] { "Store", "Generated (UTC)", "Top Recipe", "Times Sold", "Store Revenue (BHD)" };
            var summaryRows = new List<string[]> {
                new [] { storeName, generatedAt.ToString("yyyy-MM-dd HH:mm"), topName, topAmount.ToString("F3"), totalRevenue.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Top Recipes & Sales", summaryHeaders, summaryRows, new[] { 35d, 24d, 35d, 18d, 22d });

            var headers = new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" };
            var rows = recipeSales.Select(r => new[] {
                r.RecipeName ?? ("Recipe #" + r.RecipeId),
                r.TotalQty.ToString("F3"),
                r.TotalRevenue.ToString("F3")
            }).ToList();
            row = AddStyledTableAt(ws, row, "Recipe Sales", headers, rows, new[] { 50d, 20d, 22d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateTopEmployeeReportExcelAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            // All employees in the store
            var employees = await _context.Users
                .Where(u => u.StoreId == storeId)
                .Select(u => new
                {
                    u.UserId,
                    FullName = ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim()
                })
                .ToListAsync();

            // Aggregate employee sales (by user) for the store
            var salesAgg = await _context.Sales
                .Where(s => s.StoreId == storeId && s.UserId != null)
                .GroupBy(s => s.UserId)
                .Select(g => new { UserId = g.Key, TotalSales = g.Sum(x => x.TotalAmount) })
                .ToListAsync();

            // Left-join employees with sales to include zero-sales users
            var employeeSales = employees
                .Select(e => new
                {
                    e.UserId,
                    e.FullName,
                    TotalSales = salesAgg.FirstOrDefault(x => x.UserId == e.UserId)?.TotalSales ?? 0m
                })
                .OrderByDescending(x => x.TotalSales)
                .ToList();

            var top = employeeSales.FirstOrDefault();
            var topName = top?.FullName ?? "-";
            var topAmount = top?.TotalSales ?? 0m;

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Top Employee Report");
            int row = 1;

            var summaryHeaders = new[] { "Store", "Generated (UTC)", "Top Employee", "Total Sales (BHD)" };
            var summaryRows = new List<string[]> {
                new [] { storeName, generatedAt.ToString("yyyy-MM-dd HH:mm"), topName, topAmount.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Top Employee Report", summaryHeaders, summaryRows, new[] { 35d, 24d, 35d, 22d });

            var headers = new[] { "Employee Name", "Total Sales (BHD)" };
            var rows = employeeSales.Select(e => new[] {
                string.IsNullOrWhiteSpace(e.FullName) ? ("User #" + e.UserId) : e.FullName,
                e.TotalSales.ToString("F3")
            }).ToList();
            row = AddStyledTableAt(ws, row, "Store Employee Sales", headers, rows, new[] { 50d, 22d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateSalesSummaryReportExcelAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;
            var today = DateTime.UtcNow.Date;

            var todaysSales = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Date == today)
                .ToListAsync();
            var salesCountToday = todaysSales.Count;
            var revenueToday = todaysSales.Sum(s => s.TotalAmount);
            var cogsToday = await GetCOGSByStoreForMonthAsync(storeId, today.Year, today.Month);

            var monthlySales = await _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => new { s.Timestamp.Year, s.Timestamp.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(x => x.TotalAmount) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Sales Summary");
            int row = 1;

            var summaryHeaders = new[] { "Store", "Generated (UTC)", "Sales Records Today", "Revenue Today (BHD)", "COGS (Month) (BHD)" };
            var summaryRows = new List<string[]> {
                new [] { storeName, generatedAt.ToString("yyyy-MM-dd HH:mm"), salesCountToday.ToString(), revenueToday.ToString("F3"), cogsToday.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Sales Summary", summaryHeaders, summaryRows, new[] { 35d, 24d, 25d, 22d, 22d });

            var headers = new[] { "Month", "Total Sales (BHD)" };
            var rows = monthlySales.Select(m => new[]
            {
                new DateTime(m.Year, m.Month, 1).ToString("yyyy-MM"),
                m.Total.ToString("F3")
            }).ToList();
            row = AddStyledTableAt(ws, row, "Monthly Sales Totals", headers, rows, new[] { 30d, 24d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateInventoryUsageTrendsReportExcelAsync(int storeId)
        {
            var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId);
            var storeName = store?.StoreName ?? $"Store {storeId}";
            var generatedAt = DateTime.UtcNow;

            var utilizationEntries = await _context.RecipeInventoryItems
                .Include(ri => ri.Recipe)
                .Where(ri => ri.Recipe != null && ri.Recipe.StoreId == storeId)
                .ToListAsync();

            var utilization = utilizationEntries
                .GroupBy(ri => ri.InventoryItemId)
                .Select(g => new { InventoryItemId = g.Key, UtilizedQty = g.Sum(x => x.Quantity) })
                .ToList();

            var itemIds = utilization.Select(u => u.InventoryItemId).ToList();
            var items = await _context.InventoryItems
                .Where(ii => ii.StoreId == storeId && itemIds.Contains(ii.InventoryItemId))
                .Select(ii => new { ii.InventoryItemId, ii.InventoryItemName })
                .ToListAsync();

            // Aggregate sold quantities per recipe used at this store
            var salesByRecipe = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.StoreId == storeId && si.Product != null && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId!.Value)
                .Select(g => new { RecipeId = g.Key, SoldQty = g.Sum(x => x.Quantity) })
                .ToListAsync();

            // Build map inventoryItemId -> set of recipeIds that include it
            var recipeIdsByItem = utilizationEntries
                .GroupBy(ri => ri.InventoryItemId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.RecipeId).Distinct().ToList()
                );

            var rowsData = items
                .Select(i => new
                {
                    Name = string.IsNullOrWhiteSpace(i.InventoryItemName) ? ($"Item #{i.InventoryItemId}") : i.InventoryItemName!,
                    UtilizedQty = utilization.FirstOrDefault(u => u.InventoryItemId == i.InventoryItemId)?.UtilizedQty ?? 0m,
                    SoldQty = (recipeIdsByItem.TryGetValue(i.InventoryItemId, out var rids)
                        ? salesByRecipe.Where(s => rids.Contains(s.RecipeId)).Sum(s => s.SoldQty)
                        : 0m)
                })
                .OrderByDescending(x => x.UtilizedQty)
                .ToList();

            var mostUtilized = rowsData.FirstOrDefault();
            var mostUtilizedName = mostUtilized?.Name ?? "-";

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Inventory Usage Trends");
            int row = 1;

            var summaryHeaders = new[] { "Store", "Generated (UTC)", "Most Utilized Item" };
            var summaryRows = new List<string[]> {
                new [] { storeName, generatedAt.ToString("yyyy-MM-dd HH:mm"), mostUtilizedName }
            };
            row = AddStyledTableAt(ws, row, "Inventory Usage Trends", summaryHeaders, summaryRows, new[] { 35d, 24d, 35d });

            var headers = new[] { "Inventory Item", "Utilized in Recipes (Qty)", "Sold as Product (Qty)" };
            var rows = rowsData.Select(r => new[] { r.Name ?? "-", r.UtilizedQty.ToString("F3"), r.SoldQty.ToString("F3") }).ToList();
            row = AddStyledTableAt(ws, row, "Inventory Utilization & Sales", headers, rows, new[] { 50d, 22d, 22d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        // Monthly COGS Report (PDF & Excel)
        public async Task<byte[]> GenerateMonthlyCogsReportExcelAsync(int organizationId, int year, int month)
        {
            // Organization metadata and totals
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? ($"Org {organizationId}");
            var orgCogs = await GetCOGSByOrganizationForMonthAsync(organizationId, year, month);

            // Per-store breakdown
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();
            var tableRows = new List<string[]>();
            foreach (var st in stores)
            {
                var cogs = await GetCOGSByStoreForMonthAsync(st.StoreId, year, month);
                tableRows.Add(new[] { st.StoreName ?? ($"Store {st.StoreId}"), cogs.ToString("F3") });
            }

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Monthly COGS");
            int r = 1;

            // Header / summary block
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Organization COGS (BHD)" };
            var summaryRows = new List<string[]>
            {
                new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), new DateTime(year, month, 1).ToString("yyyy-MM"), orgCogs.ToString("F3") }
            };
            r = AddStyledTableAt(ws, r, "Monthly COGS Report", summaryHeaders, summaryRows, new[] { 40d, 30d, 20d, 20d });

            // Stores table
            var headers = new[] { "Store", "COGS (BHD)" };
            AddStyledTableAt(ws, r, "Store COGS Breakdown", headers, tableRows, new[] { 60d, 30d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateMonthlyCogsReportPdfAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? ($"Org {organizationId}");
            var orgCogs = await GetCOGSByOrganizationForMonthAsync(organizationId, year, month);
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header block
                DrawSectionHeader(gfx, "Monthly COGS Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {new DateTime(year, month, 1):yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization COGS: BHD {orgCogs:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                // Stores table
                DrawSectionHeader(gfx, "Store COGS Breakdown", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.7, contentWidth * 0.3 };
                DrawTableHeader(gfx, new[] { "Store", "COGS (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var st in stores)
                {
                    var cogs = await GetCOGSByStoreForMonthAsync(st.StoreId, year, month);
                    DrawTableRow(gfx, new[] { st.StoreName ?? ($"Store {st.StoreId}"), cogs.ToString("F3") }, textFont, x, ref y, widths, gridPen);

                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Store", "COGS (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }


        // Monthly Gross Profit & Profit Margin Report (PDF & Excel)
        public async Task<byte[]> GenerateMonthlyGrossProfitReportExcelAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? ($"Org {organizationId}");
            var orgGrossProfit = await GetGrossProfitByOrganizationForMonthAsync(organizationId, year, month);
            var orgProfitMargin = await GetProfitMarginByOrganizationForMonthAsync(organizationId, year, month);

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();
            var rows = new List<string[]>();
            foreach (var st in stores)
            {
                var gp = await GetGrossProfitByStoreForMonthAsync(st.StoreId, year, month);
                var margin = await GetProfitMarginByStoreForMonthAsync(st.StoreId, year, month);
                rows.Add(new[] {
                    st.StoreName ?? ($"Store {st.StoreId}"),
                    gp.ToString("F3"),
                    margin.ToString("F2")
                });
            }

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Monthly Gross Profit");
            int r = 1;

            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Organization Gross Profit (BHD)", "Organization Profit Margin (%)" };
            var summaryRows = new List<string[]> {
                new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), new DateTime(year, month, 1).ToString("yyyy-MM"), orgGrossProfit.ToString("F3"), orgProfitMargin.ToString("F2") }
            };
            r = AddStyledTableAt(ws, r, "Monthly Gross Profit & Margin Report", summaryHeaders, summaryRows, new[] { 30d, 22d, 18d, 28d, 20d });

            var headers = new[] { "Store", "Gross Profit (BHD)", "Profit Margin (%)" };
            AddStyledTableAt(ws, r, "Store Gross Profit & Margin", headers, rows, new[] { 55d, 30d, 20d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateMonthlyGrossProfitReportPdfAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? ($"Org {organizationId}");
            var orgGrossProfit = await GetGrossProfitByOrganizationForMonthAsync(organizationId, year, month);
            var orgProfitMargin = await GetProfitMarginByOrganizationForMonthAsync(organizationId, year, month);
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                DrawSectionHeader(gfx, "Monthly Gross Profit & Margin Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {new DateTime(year, month, 1):yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Gross Profit: BHD {orgGrossProfit:F3}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Profit Margin: {orgProfitMargin:F2} %", textFont, x, ref y, contentWidth);

                y += 8;
                DrawSectionHeader(gfx, "Store Gross Profit & Margin", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.6, contentWidth * 0.2, contentWidth * 0.2 };
                DrawTableHeader(gfx, new[] { "Store", "Gross Profit (BHD)", "Profit Margin (%)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var st in stores)
                {
                    var gp = await GetGrossProfitByStoreForMonthAsync(st.StoreId, year, month);
                    var margin = await GetProfitMarginByStoreForMonthAsync(st.StoreId, year, month);
                    DrawTableRow(gfx, new[] { st.StoreName ?? ($"Store {st.StoreId}"), gp.ToString("F3"), margin.ToString("F2") }, textFont, x, ref y, widths, gridPen);

                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Store", "Gross Profit (BHD)", "Profit Margin (%)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        // Inventory Valuation Report (Excel only)
        // - Uses helper workbook functions to match existing report style.
        // - Summary header: title, organization name, generated-at, organization inventory value.
        // - Then per-store section: store inventory value + table of items (name, quantity, supplier, contact, cost/unit, unit).

public async Task<byte[]> GenerateInventoryValuationReportExcelAsync(int organizationId)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? ($"Org {organizationId}");

            // gather stores
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            // compute per-store and org inventory value using inventory repo when available,
            // fallback to summing InventoryItem.Quantity * InventoryItem.CostPerUnit
            var perStoreValues = new Dictionary<int, decimal>();
            decimal orgInventoryValue = 0m;
            foreach (var st in stores)
            {
                decimal storeValue = 0m;
                try
                {
                    storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId);
                }
                catch
                {
                    // fallback: use strongly-typed InventoryItem properties
                    var fallbackItems = await _inventory_repo_safe_GetItemsByStoreAsync(st.StoreId);
                    storeValue = fallbackItems.Sum(ii => ii.Quantity * ii.CostPerUnit);
                }

                perStoreValues[st.StoreId] = storeValue;
                orgInventoryValue += storeValue;
            }

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Inventory Valuation");
            int r = 1;

            // Summary block
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Organization Inventory Value (BHD)" };
            var summaryRows = new List<string[]>
    {
        new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), orgInventoryValue.ToString("F3") }
    };
            r = AddStyledTableAt(ws, r, "Inventory Valuation Report", summaryHeaders, summaryRows, new[] { 40d, 30d, 30d });

            // Per-store detail blocks
            var itemHeaders = new[] { "Item Name", "Quantity", "Supplier", "Contact", "Cost/Unit (BHD)", "Unit" };
            foreach (var st in stores)
            {
                var storeValue = perStoreValues.TryGetValue(st.StoreId, out var sv) ? sv : 0m;

                // Store summary
                var storeSummaryHeaders = new[] { "Store", "Inventory Value (BHD)" };
                var storeSummaryRows = new List<string[]> { new[] { st.StoreName ?? ($"Store {st.StoreId}"), storeValue.ToString("F3") } };
                r = AddStyledTableAt(ws, r, $"Store: {st.StoreName ?? ($"Store {st.StoreId}")}", storeSummaryHeaders, storeSummaryRows, new[] { 60d, 30d });

                // Items - strongly-typed fetch (InventoryItemRepository includes Supplier and Unit)
                var items = await _inventory_repo_safe_GetItemsByStoreAsync(st.StoreId);

                var itemRows = items.Select(ii => new[]
                {
            ii.InventoryItemName ?? "-",
            ii.Quantity.ToString("F3"),
            ii.Supplier?.SupplierName ?? "-",
            ii.Supplier?.ContactMethod ?? "-",
            ii.CostPerUnit.ToString("F3"),
            ii.Unit?.UnitName ?? "-"
        }).ToList();

                r = AddStyledTableAt(ws, r, "Inventory Items", itemHeaders, itemRows, new[] { 35d, 12d, 23d, 20d, 20d, 10d });
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        // helper: try inventory repo then fallback to context items
        private async Task<List<InventoryItem>> _inventory_repo_safe_GetItemsByStoreAsync(int storeId)
        {
            try
            {
                var items = await _inventoryRepo.GetItemsByStoreAsync(storeId);
                return items.ToList();
            }
            catch
            {
                var items = await _context.InventoryItems
                    .Include(ii => ii.Supplier)
                    .Include(ii => ii.Unit)
                    .Where(ii => ii.StoreId == storeId)
                    .ToListAsync();
                return items;
            }
        }


// Add these two methods to ReportRepository (place near other report generation methods)

public async Task<byte[]> GenerateSalesByRecipeReportExcelAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            // Organization level aggregation (recipes sold across all stores)
            var orgRecipeSales = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.Store != null
                             && si.Sale.Store.OrgId == organizationId
                             && si.Sale.Timestamp >= periodStart
                             && si.Sale.Timestamp <= periodEnd
                             && si.Product != null
                             && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new
                {
                    RecipeId = g.Key,
                    RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault(),
                    QtySold = g.Sum(x => x.Quantity),
                    Revenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m))
                })
                .ToListAsync();

            var orgTotalCount = orgRecipeSales.Sum(x => x.QtySold);
            var orgTotalRevenue = orgRecipeSales.Sum(x => x.Revenue);

            // Per-store breakdown
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Sales by Recipe");
            int row = 1;

            // Summary block
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Recipes Sold (Qty)", "Total Revenue (BHD)" };
            var summaryRows = new List<string[]> {
        new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), periodStart.ToString("yyyy-MM"), orgTotalCount.ToString("F3"), orgTotalRevenue.ToString("F3") }
    };
            row = AddStyledTableAt(ws, row, "Sales Summary by Recipe", summaryHeaders, summaryRows, new[] { 30d, 24d, 18d, 18d, 22d });

            // For each store: summary + table of recipes
            var recipeHeaders = new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" };
            foreach (var st in stores)
            {
                // store-level aggregation by recipe
                var storeRecipeSales = await _context.SaleItems
                    .Include(si => si.Sale)
                    .Include(si => si.Product)
                    .ThenInclude(p => p.Recipe)
                    .Where(si => si.Sale.StoreId == st.StoreId
                                 && si.Sale.Timestamp >= periodStart
                                 && si.Sale.Timestamp <= periodEnd
                                 && si.Product != null
                                 && si.Product.RecipeId != null)
                    .GroupBy(si => si.Product!.RecipeId)
                    .Select(g => new
                    {
                        RecipeId = g.Key,
                        RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault(),
                        QtySold = g.Sum(x => x.Quantity),
                        Revenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m))
                    })
                    .OrderByDescending(x => x.QtySold)
                    .ToListAsync();

                var storeSummaryHeaders = new[] { "Store", "Recipes Sold (Qty)", "Store Revenue (BHD)" };
                var storeSummaryRows = new List<string[]>
        {
            new[] { st.StoreName ?? $"Store {st.StoreId}", storeRecipeSales.Sum(x => x.QtySold).ToString("F3"), storeRecipeSales.Sum(x => x.Revenue).ToString("F3") }
        };
                row = AddStyledTableAt(ws, row, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", storeSummaryHeaders, storeSummaryRows, new[] { 45d, 25d, 25d });

                var rows = storeRecipeSales.Select(s => new[]
                {
            s.RecipeName ?? $"Recipe #{s.RecipeId}",
            s.QtySold.ToString("F3"),
            s.Revenue.ToString("F3")
        }).ToList();

                row = AddStyledTableAt(ws, row, "Sales by Recipe (Store)", recipeHeaders, rows, new[] { 50d, 20d, 22d });
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateSalesByRecipeReportPdfAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            // Organization level aggregation
            var orgRecipeSales = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Where(si => si.Sale.Store != null
                             && si.Sale.Store.OrgId == organizationId
                             && si.Sale.Timestamp >= periodStart
                             && si.Sale.Timestamp <= periodEnd
                             && si.Product != null
                             && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new
                {
                    RecipeId = g.Key,
                    RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault(),
                    QtySold = g.Sum(x => x.Quantity),
                    Revenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m))
                })
                .ToListAsync();

            var orgTotalCount = orgRecipeSales.Sum(x => x.QtySold);
            var orgTotalRevenue = orgRecipeSales.Sum(x => x.Revenue);

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header / summary
                DrawSectionHeader(gfx, "Sales Summary by Recipe", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {periodStart:yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Recipes Sold (Qty): {orgTotalCount:F3}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Total Revenue: BHD {orgTotalRevenue:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                // Per-store sections
                var widths = new[] { contentWidth * 0.6, contentWidth * 0.2, contentWidth * 0.2 };
                foreach (var st in stores)
                {
                    // store-level aggregation
                    var storeRecipeSales = await _context.SaleItems
                        .Include(si => si.Sale)
                        .Include(si => si.Product)
                        .ThenInclude(p => p.Recipe)
                        .Where(si => si.Sale.StoreId == st.StoreId
                                     && si.Sale.Timestamp >= periodStart
                                     && si.Sale.Timestamp <= periodEnd
                                     && si.Product != null
                                     && si.Product.RecipeId != null)
                        .GroupBy(si => si.Product!.RecipeId)
                        .Select(g => new
                        {
                            RecipeId = g.Key,
                            RecipeName = g.Select(x => x.Product!.Recipe!.RecipeName).FirstOrDefault(),
                            QtySold = g.Sum(x => x.Quantity),
                            Revenue = g.Sum(x => x.Quantity * (x.Product!.SellingPrice ?? 0m))
                        })
                        .OrderByDescending(x => x.QtySold)
                        .ToListAsync();

                    DrawSectionHeader(gfx, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", headerFont, x, ref y, contentWidth, headerBg);
                    // table header
                    DrawTableHeader(gfx, new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);

                    foreach (var r in storeRecipeSales)
                    {
                        DrawTableRow(gfx, new[] { r.RecipeName ?? $"Recipe #{r.RecipeId}", r.QtySold.ToString("F3"), r.Revenue.ToString("F3") }, textFont, x, ref y, widths, gridPen);
                        if (y > page.Height.Point - 72)
                        {
                            page = document.AddPage();
                            gfx.Dispose();
                            gfx = XGraphics.FromPdfPage(page);
                            y = 36;
                            DrawTableHeader(gfx, new[] { "Recipe Name", "Qty Sold", "Revenue (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                        }
                    }

                    y += 8;
                    if (y > page.Height.Point - 120)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }


        public async Task<byte[]> GenerateMonthlySalesReportExcelAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            // Organization totals
            var orgSalesCount = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .CountAsync();
            var orgSalesTotal = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Monthly Sales");
            int row = 1;

            // Summary block
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Sales Count", "Total Paid (BHD)" };
            var summaryRows = new List<string[]> {
        new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), periodStart.ToString("yyyy-MM"), orgSalesCount.ToString(), orgSalesTotal.ToString("F3") }
    };
            row = AddStyledTableAt(ws, row, "Monthly Sales Report", summaryHeaders, summaryRows, new[] { 30d, 24d, 18d, 18d, 22d });

            // Per-store breakdown
            var storeHeaders = new[] { "Store", "Sales Count", "Total Paid (BHD)" };
            foreach (var st in stores)
            {
                var storeCount = await _context.Sales
                    .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                    .CountAsync();
                var storeTotal = await _context.Sales
                    .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                    .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

                var storeRows = new List<string[]> { new[] { st.StoreName ?? $"Store {st.StoreId}", storeCount.ToString(), storeTotal.ToString("F3") } };
                row = AddStyledTableAt(ws, row, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", storeHeaders, storeRows, new[] { 50d, 20d, 22d });
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateMonthlySalesReportPdfAsync(int organizationId, int year, int month)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var orgSalesCount = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .CountAsync();
            var orgSalesTotal = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header / summary
                DrawSectionHeader(gfx, "Monthly Sales Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {periodStart:yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Sales Count: {orgSalesCount}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Total Paid: BHD {orgSalesTotal:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                var widths = new[] { contentWidth * 0.6, contentWidth * 0.4 };
                foreach (var st in stores)
                {
                    var storeCount = await _context.Sales
                        .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                        .CountAsync();
                    var storeTotal = await _context.Sales
                        .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                        .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

                    DrawSectionHeader(gfx, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", headerFont, x, ref y, contentWidth, headerBg);
                    // table header
                    DrawTableHeader(gfx, new[] { "Sales Count", "Total Paid (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    DrawTableRow(gfx, new[] { storeCount.ToString(), storeTotal.ToString("F3") }, textFont, x, ref y, widths, gridPen);

                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Sales Count", "Total Paid (BHD)" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }

                    y += 8;
                    if (y > page.Height.Point - 120)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                    }
                }

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }


        // --- new: Store Performance Excel report ---
        public async Task<byte[]> GenerateStorePerformanceReportExcelAsync(int organizationId, int year, int month)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            // Organization totals
            var orgSalesCount = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .CountAsync();
            var orgSalesTotal = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Store Performance");
            int row = 1;

            // Summary block
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Sales Count", "Total Paid (BHD)" };
            var summaryRows = new List<string[]> {
        new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), periodStart.ToString("yyyy-MM"), orgSalesCount.ToString(), orgSalesTotal.ToString("F3") }
    };
            row = AddStyledTableAt(ws, row, "Store Performance Report", summaryHeaders, summaryRows, new[] { 30d, 24d, 18d, 18d, 22d });

            // Per-store breakdown
            var storeHeaders = new[] { "Store", "Sales Count", "Total Paid (BHD)", "Inventory Value (BHD)", "Incoming Transfers", "Outgoing Transfers" };
            foreach (var st in stores)
            {
                var storeCount = await _context.Sales
                    .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                    .CountAsync();
                var storeTotal = await _context.Sales
                    .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                    .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

                decimal storeValue = 0m;
                try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                var transfers = await GetInventoryTransferCountsAsync(st.StoreId, periodStart, periodEnd);

                var storeRows = new List<string[]> {
            new[] {
                st.StoreName ?? $"Store {st.StoreId}",
                storeCount.ToString(),
                storeTotal.ToString("F3"),
                storeValue.ToString("F3"),
                transfers.Incoming.ToString(),
                transfers.Outgoing.ToString()
            }
        };

                row = AddStyledTableAt(ws, row, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", storeHeaders, storeRows, new[] { 30d, 14d, 18d, 18d, 14d, 14d });
            }

            // AI recommendations (single cell)
            string recommendations;
            try
            {
                var promptBuilder = new StringBuilder();
                promptBuilder.AppendLine($"You are an operations analyst. Provide 4-5 short actionable recommendations (each 1-2 sentences) for improving store performance based on the following Store Performance summary for {orgName} for {periodStart:yyyy-MM}:");
                promptBuilder.AppendLine();
                promptBuilder.AppendLine($"Organization totals: Sales Count = {orgSalesCount}, Total Paid = BHD {orgSalesTotal:F3}.");
                promptBuilder.AppendLine("Per-store summary (StoreName | SalesCount | TotalPaid):");
                foreach (var st in stores)
                {
                    var sCount = await _context.Sales.Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd).CountAsync();
                    var sTotal = await _context.Sales.Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd).SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;
                    promptBuilder.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | {sCount} | BHD {sTotal:F3}");
                }
                promptBuilder.AppendLine();
                promptBuilder.AppendLine("Give concise recommendations: which stores to monitor closely, inventory or transfer concerns, staffing or promotion tips.");
                var prompt = promptBuilder.ToString();
                recommendations = await _geminiService.SendMessageAsync(prompt);
                if (string.IsNullOrWhiteSpace(recommendations)) recommendations = "No recommendations returned.";
            }
            catch
            {
                recommendations = "No recommendations available (AI service error).";
            }

            // Add recommendations as a small table
            var recHeaders = new[] { "AI Recommendations" };
            var recRows = new List<string[]> { new[] { recommendations } };
            row = AddStyledTableAt(ws, row, "AI Recommendations", recHeaders, recRows, new[] { 100d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }



        // --- new: Store Performance PDF report ---
        public async Task<byte[]> GenerateStorePerformanceReportPdfAsync(int organizationId, int year, int month)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            // Organization totals
            var orgSalesCount = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .CountAsync();
            var orgSalesTotal = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header / summary
                DrawSectionHeader(gfx, "Store Performance Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {periodStart:yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Sales Count: {orgSalesCount}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Total Paid: BHD {orgSalesTotal:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                // Per-store table header
                DrawSectionHeader(gfx, "Per-Store Breakdown", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.28, contentWidth * 0.14, contentWidth * 0.18, contentWidth * 0.18, contentWidth * 0.12, contentWidth * 0.10 };
                DrawTableHeader(gfx, new[] { "Store", "Sales Count", "Total Paid (BHD)", "Inventory Value (BHD)", "Incoming", "Outgoing" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var st in stores)
                {
                    var storeCount = await _context.Sales
                        .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                        .CountAsync();
                    var storeTotal = await _context.Sales
                        .Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                        .SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;

                    decimal storeValue = 0m;
                    try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                    catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                    var transfers = await GetInventoryTransferCountsAsync(st.StoreId, periodStart, periodEnd);

                    DrawTableRow(gfx, new[] {
                st.StoreName ?? $"Store {st.StoreId}",
                storeCount.ToString(),
                storeTotal.ToString("F3"),
                storeValue.ToString("F3"),
                transfers.Incoming.ToString(),
                transfers.Outgoing.ToString()
            }, textFont, x, ref y, widths, gridPen);

                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Store", "Sales Count", "Total Paid (BHD)", "Inventory Value (BHD)", "Incoming", "Outgoing" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                y += 8;

                // AI recommendations
                string recommendations;
                try
                {
                    var promptBuilder = new StringBuilder();
                    promptBuilder.AppendLine($"You are an operations analyst. Provide 4-5 short actionable recommendations (each 1-2 sentences) for improving store performance for {orgName} for {periodStart:yyyy-MM}.");
                    promptBuilder.AppendLine();
                    promptBuilder.AppendLine($"Organization totals: Sales Count = {orgSalesCount}, Total Paid = BHD {orgSalesTotal:F3}.");
                    promptBuilder.AppendLine("Per-store summary:");
                    foreach (var st in stores)
                    {
                        var sCount = await _context.Sales.Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd).CountAsync();
                        var sTotal = await _context.Sales.Where(s => s.StoreId == st.StoreId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd).SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;
                        promptBuilder.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | {sCount} | BHD {sTotal:F3}");
                    }
                    promptBuilder.AppendLine();
                    promptBuilder.AppendLine("Give concise recommendations: which stores to monitor closely, inventory or transfer concerns, staffing or promotion tips.");
                    var prompt = promptBuilder.ToString();
                    recommendations = await _geminiService.SendMessageAsync(prompt);
                    if (string.IsNullOrWhiteSpace(recommendations)) recommendations = "No recommendations returned.";
                }
                catch
                {
                    recommendations = "No recommendations available (AI service error).";
                }


                // Ensure space for recommendations block
                var availableHeight = page.Height.Point - y - 36;
                var recHeaderDrawn = false;
                if (availableHeight < 80) // threshold for a reasonable recommendations block
                {
                    page = document.AddPage();
                    page.Size = PdfSharpCore.PageSize.A4;
                    page.Orientation = PdfSharpCore.PageOrientation.Portrait;
                    gfx.Dispose();
                    gfx = XGraphics.FromPdfPage(page);
                    y = 36;
                    DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                    recHeaderDrawn = true;
                    availableHeight = page.Height.Point - y - 36;
                }

                // Always draw the header if it wasn't drawn above
                if (!recHeaderDrawn)
                {
                    DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                    availableHeight = page.Height.Point - y - 36;
                }

                var recRect = new XRect(x, y, contentWidth, Math.Max(8, availableHeight));                

                DrawWrappedText(gfx, recommendations, textFont, XBrushes.Black, x, y, contentWidth);

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        private double DrawWrappedText(XGraphics gfx, string text, XFont font, XBrush brush,
                               double x, double y, double maxWidth, double lineSpacing = 2)
        {
            if (string.IsNullOrWhiteSpace(text))
                return y;

            // Split into explicit lines first (respect \r\n and \n)
            var lines = text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
            double currentY = y;

            foreach (var rawLine in lines)
            {
                var words = rawLine.Split(' ');
                var line = new StringBuilder();

                foreach (var word in words)
                {
                    string testLine = line.Length == 0 ? word : line + " " + word;
                    var size = gfx.MeasureString(testLine, font);

                    if (size.Width > maxWidth)
                    {
                        // Draw current line
                        gfx.DrawString(line.ToString(), font, brush,
                            new XRect(x, currentY, maxWidth, font.Height), XStringFormats.TopLeft);

                        // Move down
                        currentY += font.Height + lineSpacing;

                        // Start new line
                        line.Clear();
                        line.Append(word);
                    }
                    else
                    {
                        line.Clear();
                        line.Append(testLine);
                    }
                }

                // Draw last line of this paragraph
                if (line.Length > 0)
                {
                    gfx.DrawString(line.ToString(), font, brush,
                        new XRect(x, currentY, maxWidth, font.Height), XStringFormats.TopLeft);
                    currentY += font.Height + lineSpacing;
                }
                else
                {
                    // Even if the line was empty, respect the break
                    currentY += font.Height + lineSpacing;
                }
            }

            return currentY; // return the final Y so you can continue layout below
        }

        // Employee Sales Performance - Excel
        public async Task<byte[]> GenerateEmployeeSalesPerformanceReportExcelAsync(int organizationId, int year, int month)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            // Sales grouped by user for the organization in period
            var grouped = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .GroupBy(s => s.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    SalesCount = g.Count(),
                    Total = g.Sum(s => s.TotalAmount),
                    FirstSale = g.Min(s => s.Timestamp),
                    LastSale = g.Max(s => s.Timestamp)
                })
                .ToListAsync();

            // extract non-null user ids without using .HasValue
            var userIds = grouped.Select(g => g.UserId).OfType<int>().Distinct().ToList();
            var users = await _context.Users
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId, u => $"{u.UserFirstname} {u.UserLastname}");

            var orgTotal = grouped.Sum(g => g.Total);

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Employee Sales Performance");
            int row = 1;

            // Header / summary
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Period", "Organization Total Paid (BHD)" };
            var summaryRows = new List<string[]>
            {
                new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), periodStart.ToString("yyyy-MM"), orgTotal.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Employee Sales Performance Report", summaryHeaders, summaryRows, new[] { 40d, 28d, 22d, 30d });

            // Per-employee table
            var headers = new[] { "Employee", "Sales Count", "Total Paid (BHD)", "First Sale (UTC)", "Last Sale (UTC)" };
            var rows = grouped.Select(g =>
            {
                string displayName;
                if (g.UserId is int uid && users.TryGetValue(uid, out var n))
                    displayName = n;
                else if (g.UserId is int uid2)
                    displayName = $"User #{uid2}";
                else
                    displayName = "Unknown";

                return new[]
                {
                    displayName,
                    g.SalesCount.ToString(),
                    g.Total.ToString("F3"),
                    g.FirstSale.ToString("yyyy-MM-dd"),
                    g.LastSale.ToString("yyyy-MM-dd")
                };
            }).ToList();

            row = AddStyledTableAt(ws, row, "Per-Employee Breakdown", headers, rows, new[] { 35d, 15d, 20d, 15d, 15d });

            // Prepare AI recommendations prompt
            string recommendations;
            try
            {
                var sb = new StringBuilder();
                sb.AppendLine($"You are an operations analyst. Provide 4-5 short, actionable recommendations (each 1-2 sentences) for improving employee performance monitoring and recognition at \"{orgName}\" for the period {periodStart:yyyy-MM}.");
                sb.AppendLine();
                sb.AppendLine($"Organization totals: Total Paid Sales = BHD {orgTotal:F3}.");
                sb.AppendLine();
                sb.AppendLine("Per-employee summary: Name | SalesCount | TotalPaid | FirstSale - LastSale");
                foreach (var g in grouped)
                {
                    string name;
                    if (g.UserId is int uid && users.TryGetValue(uid, out var n))
                        name = n;
                    else if (g.UserId is int uid2)
                        name = $"User #{uid2}";
                    else
                        name = "Unknown";

                    sb.AppendLine($"{name} | {g.SalesCount} | BHD {g.Total:F3} | {g.FirstSale:yyyy-MM-dd} - {g.LastSale:yyyy-MM-dd}");
                }
                sb.AppendLine();
                sb.AppendLine("Give concise recommendations: which employees to monitor, reward or coach; quick staffing or schedule suggestions; training or incentive ideas.");
                var prompt = sb.ToString();
                recommendations = await _geminiService.SendMessageAsync(prompt);
                if (string.IsNullOrWhiteSpace(recommendations)) recommendations = "No recommendations returned.";
            }
            catch
            {
                recommendations = "No recommendations available (AI service error).";
            }

            // Add recommendations as a single-cell table row
            var recHeaders = new[] { "AI Recommendations" };
            var recRows = new List<string[]> { new[] { recommendations } };
            row = AddStyledTableAt(ws, row, "AI Recommendations", recHeaders, recRows, new[] { 100d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        // Employee Sales Performance - PDF
        public async Task<byte[]> GenerateEmployeeSalesPerformanceReportPdfAsync(int organizationId, int year, int month)
        {
            var periodStart = new DateTime(year, month, 1);
            var periodEnd = periodStart.AddMonths(1).AddTicks(-1);

            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            var grouped = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp >= periodStart && s.Timestamp <= periodEnd)
                .GroupBy(s => s.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    SalesCount = g.Count(),
                    Total = g.Sum(s => s.TotalAmount),
                    FirstSale = g.Min(s => s.Timestamp),
                    LastSale = g.Max(s => s.Timestamp)
                })
                .ToListAsync();

            var userIds = grouped.Select(g => g.UserId).OfType<int>().Distinct().ToList();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => $"{u.UserFirstname} {u.UserLastname}");

            var orgTotal = grouped.Sum(g => g.Total);

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

                // Header / summary
                DrawSectionHeader(gfx, "Employee Sales Performance Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Period: {periodStart:yyyy-MM}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Total Paid: BHD {orgTotal:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                // Per-employee table header
                DrawSectionHeader(gfx, "Per-Employee Breakdown", headerFont, x, ref y, contentWidth, headerBg);
                var widths = new[] { contentWidth * 0.36, contentWidth * 0.14, contentWidth * 0.18, contentWidth * 0.16, contentWidth * 0.16 };
                DrawTableHeader(gfx, new[] { "Employee", "Sales Count", "Total Paid (BHD)", "First Sale", "Last Sale" }, headerFont, x, ref y, widths, headerBg, gridPen);

                foreach (var g in grouped)
                {
                    string name;
                    if (g.UserId is int uid && users.TryGetValue(uid, out var n))
                        name = n;
                    else if (g.UserId is int uid2)
                        name = $"User #{uid2}";
                    else
                        name = "Unknown";

                    DrawTableRow(gfx, new[] {
                        name,
                        g.SalesCount.ToString(),
                        g.Total.ToString("F3"),
                        g.FirstSale.ToString("yyyy-MM-dd"),
                        g.LastSale.ToString("yyyy-MM-dd")
                    }, textFont, x, ref y, widths, gridPen);

                    if (y > page.Height.Point - 72)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                        DrawTableHeader(gfx, new[] { "Employee", "Sales Count", "Total Paid (BHD)", "First Sale", "Last Sale" }, headerFont, x, ref y, widths, headerBg, gridPen);
                    }
                }

                y += 8;

                // AI recommendations prompt and result
                string recommendations;
                try
                {
                    var sb = new StringBuilder();
                    sb.AppendLine($"You are an operations analyst. Provide 4-5 short, actionable recommendations (each 1-2 sentences) for improving employee performance monitoring and recognition at \"{orgName}\" for {periodStart:yyyy-MM}.");
                    sb.AppendLine();
                    sb.AppendLine($"Organization totals: Total Paid Sales = BHD {orgTotal:F3}.");
                    sb.AppendLine();
                    sb.AppendLine("Per-employee summary: Name | SalesCount | TotalPaid | FirstSale - LastSale");
                    foreach (var g in grouped)
                    {
                        string name;
                        if (g.UserId is int uid && users.TryGetValue(uid, out var n))
                            name = n;
                        else if (g.UserId is int uid2)
                            name = $"User #{uid2}";
                        else
                            name = "Unknown";

                        sb.AppendLine($"{name} | {g.SalesCount} | BHD {g.Total:F3} | {g.FirstSale:yyyy-MM-dd} - {g.LastSale:yyyy-MM-dd}");
                    }
                    sb.AppendLine();
                    sb.AppendLine("Give concise recommendations: which employees to monitor, reward or coach; quick staffing or schedule suggestions; training or incentive ideas.");
                    var prompt = sb.ToString();
                    recommendations = await _geminiService.SendMessageAsync(prompt);
                    if (string.IsNullOrWhiteSpace(recommendations)) recommendations = "No recommendations returned.";
                }
                catch
                {
                    recommendations = "No recommendations available (AI service error).";
                }

                // Ensure space and draw header for recommendations
                var availableHeight = page.Height.Point - y - 36;
                var recHeaderDrawn = false;
                if (availableHeight < 80)
                {
                    page = document.AddPage();
                    page.Size = PdfSharpCore.PageSize.A4;
                    page.Orientation = PdfSharpCore.PageOrientation.Portrait;
                    gfx.Dispose();
                    gfx = XGraphics.FromPdfPage(page);
                    y = 36;
                    DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                    recHeaderDrawn = true;
                    availableHeight = page.Height.Point - y - 36;
                }

                if (!recHeaderDrawn)
                {
                    DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                    availableHeight = page.Height.Point - y - 36;
                }

                // Draw recommendations with safe wrapper
                DrawWrappedText(gfx, recommendations ?? string.Empty, textFont, XBrushes.Black, x, y, contentWidth);

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        // Add both implementations near other report generation methods in ReportRepository.

        public async Task<byte[]> GenerateInventoryUtilizationReportExcelAsync(int organizationId)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var generatedAt = DateTime.UtcNow;

            // Organization inventory value (try inventory repo first)
            decimal orgInventoryValue = 0m;
            try
            {
                orgInventoryValue = await _inventoryRepo.GetInventoryMonetaryValueByOrganizationAsync(organizationId);
            }
            catch
            {
                orgInventoryValue = await _context.InventoryItems
                    .Include(ii => ii.Store)
                    .Where(ii => ii.Store != null && ii.Store.OrgId == organizationId)
                    .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m;
            }

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Inventory Utilization");
            int row = 1;

            // Header / organization summary
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Organization Inventory Value (BHD)" };
            var summaryRows = new List<string[]>
            {
                new[] { orgName, generatedAt.ToString("yyyy-MM-dd HH:mm"), orgInventoryValue.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Inventory Utilization Report", summaryHeaders, summaryRows, new[] { 40d, 30d, 30d });

            // Per-store sections
            foreach (var st in stores)
            {
                decimal storeValue = 0m;
                try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                // Get top utilized items for the store (reuse existing helper)
                var topUtil = (await GetItemUtilizationAsync(st.StoreId, 5)).ToList();
                var mostUtilizedText = topUtil.Any()
                    ? string.Join(", ", topUtil.Select(t => $"{t.Name} ({t.Value:F3})"))
                    : "-";

                // Store summary row (Store, Value, Top items)
                var storeSummaryHeaders = new[] { "Store", "Inventory Value (BHD)", "Most Utilized Items" };
                var storeSummaryRows = new List<string[]> { new[] { st.StoreName ?? $"Store {st.StoreId}", storeValue.ToString("F3"), mostUtilizedText } };
                row = AddStyledTableAt(ws, row, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", storeSummaryHeaders, storeSummaryRows, new[] { 40d, 25d, 35d });

                // Inventory items table for the store
                var items = await _inventory_repo_safe_GetItemsByStoreAsync(st.StoreId);
                var itemHeaders = new[] { "Item Name", "Category", "Quantity", "Minimum", "Cost/Unit (BHD)", "Unit", "Supplier" };
                var itemRows = items.Select(ii => new[]
                {
                    ii.InventoryItemName ?? "-",
                    ii.InventoryItemCategory?.InventoryItemCategoryName ?? "-",
                    ii.Quantity.ToString("F3"),
                    ii.MinimumQuantity?.ToString() ?? "-",
                    ii.CostPerUnit.ToString("F3"),
                    ii.Unit?.UnitName ?? "-",
                    ii.Supplier?.SupplierName ?? "-"
                }).ToList();
                row = AddStyledTableAt(ws, row, "Inventory Items", itemHeaders, itemRows, new[] { 30d, 18d, 12d, 12d, 15d, 15d, 20d });
            }

            // Build AI prompt (compact but informative)
            var promptBuilder = new StringBuilder();
            promptBuilder.AppendLine($"Inventory Utilization Report for \"{orgName}\"");
            promptBuilder.AppendLine($"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC");
            promptBuilder.AppendLine($"Organization inventory value: BHD {orgInventoryValue:F3}");
            promptBuilder.AppendLine();
            promptBuilder.AppendLine("Per-store summary (Store | InventoryValue | TopUtilizedItems):");
            foreach (var st in stores)
            {
                decimal storeValue = 0m;
                try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                var topUtil = (await GetItemUtilizationAsync(st.StoreId, 5)).ToList();
                var mostUtilizedText = topUtil.Any() ? string.Join(", ", topUtil.Select(t => $"{t.Name} ({t.Value:F3})")) : "-";
                promptBuilder.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | BHD {storeValue:F3} | {mostUtilizedText}");
            }

            promptBuilder.AppendLine();
            promptBuilder.AppendLine("Using the summary above, provide 4-5 short, actionable recommendations (each 1-2 sentences) for better inventory management across the organization. Specifically:");
            promptBuilder.AppendLine("- Recommend which items to consider ordering more of (high utilization, low stock).");
            promptBuilder.AppendLine("- Recommend which items to be careful overstocking (low utilization, risk of waste).");
            promptBuilder.AppendLine("- Give quick operational tips for ordering cadence and safety stock.");
            promptBuilder.AppendLine();
            var aiPrompt = promptBuilder.ToString();

            string recommendations;
            try
            {
                recommendations = await _geminiService.SendMessageAsync(aiPrompt) ?? "No recommendations returned.";
            }
            catch
            {
                recommendations = "No recommendations available (AI service error).";
            }

            // Add recommendations as final single-cell table
            var recHeaders = new[] { "AI Recommendations" };
            var recRows = new List<string[]> { new[] { recommendations } };
            row = AddStyledTableAt(ws, row, "AI Recommendations", recHeaders, recRows, new[] { 100d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateInventoryUtilizationReportPdfAsync(int organizationId)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";
            var generatedAt = DateTime.UtcNow;

            decimal orgInventoryValue = 0m;
            try
            {
                orgInventoryValue = await _inventoryRepo.GetInventoryMonetaryValueByOrganizationAsync(organizationId);
            }
            catch
            {
                orgInventoryValue = await _context.InventoryItems
                    .Include(ii => ii.Store)
                    .Where(ii => ii.Store != null && ii.Store.OrgId == organizationId)
                    .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m;
            }

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header block
                DrawSectionHeader(gfx, "Inventory Utilization Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization inventory value: BHD {orgInventoryValue:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                // Per-store sections
                var itemWidths = new[] { contentWidth * 0.36, contentWidth * 0.16, contentWidth * 0.12, contentWidth * 0.12, contentWidth * 0.12, contentWidth * 0.12 };
                foreach (var st in stores)
                {
                    if (y > page.Height.Point - 160)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                    }

                    DrawSectionHeader(gfx, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", headerFont, x, ref y, contentWidth, headerBg);

                    decimal storeValue = 0m;
                    try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                    catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                    var topUtil = (await GetItemUtilizationAsync(st.StoreId, 5)).ToList();
                    var mostUtilizedText = topUtil.Any() ? string.Join(", ", topUtil.Select(t => $"{t.Name} ({t.Value:F3})")) : "-";

                    DrawTableHeader(gfx, new[] { "Inventory Value (BHD)", "Most Utilized Items" }, textFont, x, ref y, new[] { contentWidth * 0.3, contentWidth * 0.7 }, headerBg, gridPen);
                    DrawTableRow(gfx, new[] { storeValue.ToString("F3"), mostUtilizedText }, textFont, x, ref y, new[] { contentWidth * 0.3, contentWidth * 0.7 }, gridPen);

                    y += 6;

                    // Items table
                    DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity", "Minimum", "Cost/Unit (BHD)", "Unit" }, textFont, x, ref y, itemWidths, headerBg, gridPen);

                    var items = await _inventory_repo_safe_GetItemsByStoreAsync(st.StoreId);
                    foreach (var ii in items)
                    {
                        var cells = new[]
                        {
                            ii.InventoryItemName ?? "-",
                            ii.InventoryItemCategory?.InventoryItemCategoryName ?? "-",
                            ii.Quantity.ToString("F3"),
                            ii.MinimumQuantity?.ToString() ?? "-",
                            ii.CostPerUnit.ToString("F3"),
                            ii.Unit?.UnitName ?? "-"
                        };
                        DrawTableRow(gfx, cells, textFont, x, ref y, itemWidths, gridPen);
                        if (y > page.Height.Point - 72)
                        {
                            page = document.AddPage();
                            gfx.Dispose();
                            gfx = XGraphics.FromPdfPage(page);
                            y = 36;
                            DrawTableHeader(gfx, new[] { "Item Name", "Category", "Quantity", "Minimum", "Cost/Unit (BHD)", "Unit" }, textFont, x, ref y, itemWidths, headerBg, gridPen);
                        }
                    }

                    y += 10;
                }

                // Build AI prompt for recommendations
                var promptBuilder = new StringBuilder();
                promptBuilder.AppendLine($"Inventory Utilization Report for \"{orgName}\"");
                promptBuilder.AppendLine($"Generated: {generatedAt:yyyy-MM-dd HH:mm} UTC");
                promptBuilder.AppendLine($"Organization inventory value: BHD {orgInventoryValue:F3}");
                promptBuilder.AppendLine();
                promptBuilder.AppendLine("Per-store summary (Store | InventoryValue | TopUtilizedItems):");
                foreach (var st in stores)
                {
                    decimal storeValue = 0m;
                    try { storeValue = await _inventoryRepo.GetInventoryMonetaryValueByStoreAsync(st.StoreId); }
                    catch { storeValue = await _context.InventoryItems.Where(ii => ii.StoreId == st.StoreId).SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m; }

                    var topUtil = (await GetItemUtilizationAsync(st.StoreId, 5)).ToList();
                    var mostUtilizedText = topUtil.Any() ? string.Join(", ", topUtil.Select(t => $"{t.Name} ({t.Value:F3})")) : "-";
                    promptBuilder.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | BHD {storeValue:F3} | {mostUtilizedText}");
                }
                promptBuilder.AppendLine();
                promptBuilder.AppendLine("Provide 4-5 short, actionable recommendations (1-2 sentences each) for improving inventory management across the organization.");
                promptBuilder.AppendLine("Focus on: which items to reorder more (high utilization + low stock), which items to avoid overstocking (low utilization + waste risk), recommended reorder cadence and safety stock guidance.");
                var aiPrompt = promptBuilder.ToString();

                string recommendations;
                try
                {
                    recommendations = await _geminiService.SendMessageAsync(aiPrompt) ?? "No recommendations returned.";
                }
                catch
                {
                    recommendations = "No recommendations available (AI service error).";
                }

                // Ensure space for recommendations block
                if (page.Height.Point - y - 36 < 80)
                {
                    page = document.AddPage();
                    gfx.Dispose();
                    gfx = XGraphics.FromPdfPage(page);
                    y = 36;
                }

                DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                DrawWrappedText(gfx, recommendations, textFont, XBrushes.Black, x, y, contentWidth);

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        // Add these two implementations near other report generation methods in ReportRepository.

        public async Task<byte[]> GenerateStoresMonthlySalesReportPdfAsync(int organizationId, int year)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            // Preload sales for organization and year
            var sales = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp.Year == year)
                .ToListAsync();

            var orgTotal = sales.Sum(s => s.TotalAmount);
            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

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

                // Header block
                DrawSectionHeader(gfx, "Stores Monthly Sales Report", titleFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization: {orgName}", headerFont, x, ref y, contentWidth, headerBg);
                DrawSectionHeader(gfx, $"Year: {year}", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", textFont, x, ref y, contentWidth);
                DrawSectionHeader(gfx, $"Organization Year Sales: BHD {orgTotal:F3}", textFont, x, ref y, contentWidth);

                y += 8;

                var monthWidths = new[] { contentWidth * 0.5, contentWidth * 0.5 };

                // Per-store sections
                foreach (var st in stores)
                {
                    if (y > page.Height.Point - 220)
                    {
                        page = document.AddPage();
                        gfx.Dispose();
                        gfx = XGraphics.FromPdfPage(page);
                        y = 36;
                    }

                    DrawSectionHeader(gfx, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", headerFont, x, ref y, contentWidth, headerBg);

                    var storeSales = sales.Where(s => s.StoreId == st.StoreId).ToList();
                    var storeTotal = storeSales.Sum(s => s.TotalAmount);

                    // Store summary (two columns)
                    DrawTableHeader(gfx, new[] { "Year Sales (BHD)", "Note" }, textFont, x, ref y, new[] { contentWidth * 0.3, contentWidth * 0.7 }, headerBg, gridPen);
                    DrawTableRow(gfx, new[] { storeTotal.ToString("F3"), "-" }, textFont, x, ref y, new[] { contentWidth * 0.3, contentWidth * 0.7 }, gridPen);

                    y += 6;

                    // Monthly table for this store (Jan..Dec)
                    DrawTableHeader(gfx, new[] { "Month", "Total Sales (BHD)" }, textFont, x, ref y, monthWidths, headerBg, gridPen);
                    for (int m = 1; m <= 12; m++)
                    {
                        var total = storeSales.Where(s => s.Timestamp.Month == m).Sum(s => s.TotalAmount);
                        DrawTableRow(gfx, new[] { new DateTime(year, m, 1).ToString("MMMM"), total.ToString("F3") }, textFont, x, ref y, monthWidths, gridPen);

                        if (y > page.Height.Point - 72)
                        {
                            page = document.AddPage();
                            gfx.Dispose();
                            gfx = XGraphics.FromPdfPage(page);
                            y = 36;
                            DrawTableHeader(gfx, new[] { "Month", "Total Sales (BHD)" }, textFont, x, ref y, monthWidths, headerBg, gridPen);
                        }
                    }

                    y += 10;
                }

                // Build AI prompt
                var sb = new StringBuilder();
                sb.AppendLine($"Stores Monthly Sales Report for \"{orgName}\" — Year {year}");
                sb.AppendLine($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
                sb.AppendLine($"Organization Year Sales: BHD {orgTotal:F3}");
                sb.AppendLine();
                sb.AppendLine("Per-store totals and peak months (Store | YearTotal | PeakMonth -> Amount):");
                foreach (var st in stores)
                {
                    var storeSales = sales.Where(s => s.StoreId == st.StoreId).ToList();
                    var storeTotal = storeSales.Sum(s => s.TotalAmount);
                    var monthGroups = storeSales.GroupBy(s => s.Timestamp.Month)
                                                .Select(g => new { Month = g.Key, Total = g.Sum(x => x.TotalAmount) })
                                                .ToList();
                    var peak = monthGroups.OrderByDescending(mg => mg.Total).FirstOrDefault();
                    var peakText = peak != null ? $"{new DateTime(year, peak.Month, 1):MMMM} -> BHD {peak.Total:F3}" : "N/A";
                    sb.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | BHD {storeTotal:F3} | {peakText}");
                }

                sb.AppendLine();
                sb.AppendLine("Please provide 4-5 short, actionable recommendations (1-2 sentences each) for store oversight:");
                sb.AppendLine("- Which stores need closer monitoring due to volatility or low performance.");
                sb.AppendLine("- Which months show congestion or peaks for specific stores and suggested operational follow-up.");
                sb.AppendLine("- Quick operational ideas to smooth demand (staffing, transfers, promotions).");

                string recommendations;
                try
                {
                    recommendations = await _geminiService.SendMessageAsync(sb.ToString()) ?? "No recommendations returned.";
                }
                catch
                {
                    recommendations = "No recommendations available (AI service error).";
                }

                // Ensure space for recommendations
                if (page.Height.Point - y - 36 < 80)
                {
                    page = document.AddPage();
                    gfx.Dispose();
                    gfx = XGraphics.FromPdfPage(page);
                    y = 36;
                }

                DrawSectionHeader(gfx, "AI Recommendations", headerFont, x, ref y, contentWidth, headerBg);
                DrawWrappedText(gfx, recommendations, textFont, XBrushes.Black, x, y, contentWidth);

                document.Save(ms);
                gfx.Dispose();
            }

            return ms.ToArray();
        }

        public async Task<byte[]> GenerateStoresMonthlySalesReportExcelAsync(int organizationId, int year)
        {
            var org = await _context.Organizations.FindAsync(organizationId);
            var orgName = org?.OrgName ?? $"Org {organizationId}";

            // Preload sales for organization and year to minimize DB roundtrips
            var sales = await _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId && s.Timestamp.Year == year)
                .ToListAsync();

            var orgTotal = sales.Sum(s => s.TotalAmount);

            var stores = await _context.Stores.Where(s => s.OrgId == organizationId).ToListAsync();

            using var wb = CreateWorkbook();
            var ws = wb.Worksheets.Add("Stores Monthly Sales");
            int row = 1;

            // Summary header
            var summaryHeaders = new[] { "Organization", "Generated (UTC)", "Year", "Year Sales (BHD)" };
            var summaryRows = new List<string[]>
            {
                new[] { orgName, DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"), year.ToString(), orgTotal.ToString("F3") }
            };
            row = AddStyledTableAt(ws, row, "Stores Monthly Sales Report", summaryHeaders, summaryRows, new[] { 35d, 30d, 15d, 20d });

            // Per-store sections with monthly table
            foreach (var st in stores)
            {
                var storeSales = sales.Where(s => s.StoreId == st.StoreId).ToList();
                var storeTotal = storeSales.Sum(s => s.TotalAmount);

                // Store summary
                var storeSummaryHeaders = new[] { "Store", "Year Sales (BHD)" };
                var storeSummaryRows = new List<string[]> { new[] { st.StoreName ?? $"Store {st.StoreId}", storeTotal.ToString("F3") } };
                row = AddStyledTableAt(ws, row, $"Store: {st.StoreName ?? $"Store {st.StoreId}"}", storeSummaryHeaders, storeSummaryRows, new[] { 60d, 40d });

                // Monthly sales table for the store (Jan..Dec)
                var monthHeaders = new[] { "Month", "Total Sales (BHD)" };
                var monthRows = new List<string[]>();
                for (int m = 1; m <= 12; m++)
                {
                    var total = storeSales.Where(s => s.Timestamp.Month == m).Sum(s => s.TotalAmount);
                    monthRows.Add(new[] { new DateTime(year, m, 1).ToString("MMMM"), total.ToString("F3") });
                }
                row = AddStyledTableAt(ws, row, "Monthly Sales", monthHeaders, monthRows, new[] { 50d, 50d });
            }

            // Build AI prompt summarizing per-store totals + month patterns
            var sb = new StringBuilder();
            sb.AppendLine($"Stores Monthly Sales Report for \"{orgName}\" — Year {year}");
            sb.AppendLine($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");
            sb.AppendLine($"Organization Year Sales: BHD {orgTotal:F3}");
            sb.AppendLine();
            sb.AppendLine("Per-store totals and monthly breakdown (Store | YearTotal | PeakMonth -> Amount):");
            foreach (var st in stores)
            {
                var storeSales = sales.Where(s => s.StoreId == st.StoreId).ToList();
                var storeTotal = storeSales.Sum(s => s.TotalAmount);
                var monthGroups = storeSales.GroupBy(s => s.Timestamp.Month).Select(g => new { Month = g.Key, Total = g.Sum(x => x.TotalAmount) }).ToList();
                var peak = monthGroups.OrderByDescending(mg => mg.Total).FirstOrDefault();
                var peakText = peak != null ? $"{new DateTime(year, peak.Month, 1):MMMM} -> BHD {peak.Total:F3}" : "N/A";
                sb.AppendLine($"{st.StoreName ?? $"Store {st.StoreId}"} | BHD {storeTotal:F3} | {peakText}");
            }
            sb.AppendLine();
            sb.AppendLine("Using the summary above, provide 4-5 short, actionable recommendations (1-2 sentences each) for store oversight. Specifically:");
            sb.AppendLine("- Indicate which stores need closer monitoring based on volatility or low performance.");
            sb.AppendLine("- Point out months where stores get congested or show peaks and suggest operational follow-up.");
            sb.AppendLine("- Provide concise operational ideas to smooth demand (staffing, promotions, transfers).");

            string recommendations;
            try
            {
                recommendations = await _geminiService.SendMessageAsync(sb.ToString()) ?? "No recommendations returned.";
            }
            catch
            {
                recommendations = "No recommendations available (AI service error).";
            }

            // Add AI recommendations as final single-cell table
            var recHeaders = new[] { "AI Recommendations" };
            var recRows = new List<string[]> { new[] { recommendations } };
            row = AddStyledTableAt(ws, row, "AI Recommendations", recHeaders, recRows, new[] { 100d });

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

    }
}