using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportRepository _reportRepository;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(IReportRepository reportRepository, ILogger<ReportsController> logger)
        {
            _reportRepository = reportRepository ?? throw new ArgumentNullException(nameof(reportRepository));
            _logger = logger;
        }

        // GET api/reports/generate?reportId=...&format=PDF|Excel|CSV&organizationId=...&storeId=...
        // NOTE: This endpoint returns a file directly. Current implementation returns empty files
        // (placeholders). Replace repository placeholder methods with real generation logic later.
        [HttpGet("generate")]
        public async Task<IActionResult> Generate([FromQuery] string reportId, [FromQuery] string format, [FromQuery] int? organizationId, [FromQuery] int? storeId)
        {
            if (string.IsNullOrWhiteSpace(reportId) || string.IsNullOrWhiteSpace(format))
            {
                return BadRequest("reportId and format are required.");
            }

            try
            {
                var fmt = format.Trim().ToLowerInvariant();

                if (fmt == "pdf")
                {
                    var bytes = await _reportRepository.GenerateReportPdfAsync(reportId, organizationId, storeId);
                    var fileName = $"{reportId}.pdf";
                    var contentType = "application/pdf";
                    return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
                }

                // Placeholder: return CSV bytes for both CSV and Excel requests, but ensure filename/content-type match bytes.
                if (fmt == "excel" || fmt == "csv")
                {
                    var bytes = await _reportRepository.GenerateReportCsvAsync(reportId, organizationId, storeId);
                    // Because our placeholder implementation produces CSV, return .csv + text/csv to avoid corrupted files.
                    var ext = "csv";
                    var fileName = $"{reportId}.{ext}";
                    var contentType = "text/csv";
                    return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
                }

                return BadRequest($"Unsupported format '{format}'. Supported: PDF, Excel, CSV.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate report {ReportId} format {Format}", reportId, format);
                return StatusCode(500, "Failed to generate report.");
            }
        }

        // -------------------------
        // Current stock report endpoints
        // -------------------------

        // GET api/reports/current-stock/pdf?storeId=123
        [HttpGet("current-stock/pdf")]
        public async Task<IActionResult> GetCurrentStockPdf([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateCurrentStockReportPdfAsync(storeId);
                var fileName = $"current-stock-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate current stock PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate current stock PDF.");
            }
        }

        

        // GET api/reports/current-stock/excel?storeId=123
        [HttpGet("current-stock/excel")]
        public async Task<IActionResult> GetCurrentStockExcel([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateCurrentStockReportExcelAsync(storeId);
                var fileName = $"current-stock-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate current stock Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate current stock Excel.");
            }
        }

        // GET api/reports/top-recipes-sales/pdf?storeId=123
        [HttpGet("top-recipes-sales/pdf")]
        public async Task<IActionResult> GetTopRecipesSalesPdf([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateTopRecipesSalesReportPdfAsync(storeId);
                var fileName = $"top-recipes-sales-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Top Recipes & Sales PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Recipes & Sales PDF.");
            }
        }

        // GET api/reports/top-recipes-sales/excel?storeId=123
        [HttpGet("top-recipes-sales/excel")]
        public async Task<IActionResult> GetTopRecipesSalesExcel([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateTopRecipesSalesReportExcelAsync(storeId);
                var fileName = $"top-recipes-sales-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Top Recipes & Sales Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Recipes & Sales Excel.");
            }
        }

        // GET api/reports/top-employee/pdf?storeId=123
        [HttpGet("top-employee/pdf")]
        public async Task<IActionResult> GetTopEmployeePdf([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateTopEmployeeReportPdfAsync(storeId);
                var fileName = $"top-employee-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Top Employee PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Employee PDF.");
            }
        }

        // GET api/reports/top-employee/excel?storeId=123
        [HttpGet("top-employee/excel")]
        public async Task<IActionResult> GetTopEmployeeExcel([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateTopEmployeeReportExcelAsync(storeId);
                var fileName = $"top-employee-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Top Employee Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Employee Excel.");
            }
        }

        // GET api/reports/sales-summary/pdf?storeId=123
        [HttpGet("sales-summary/pdf")]
        public async Task<IActionResult> GetSalesSummaryPdf([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateSalesSummaryReportPdfAsync(storeId);
                var fileName = $"sales-summary-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Sales Summary PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Sales Summary PDF.");
            }
        }

        // GET api/reports/sales-summary/excel?storeId=123
        [HttpGet("sales-summary/excel")]
        public async Task<IActionResult> GetSalesSummaryExcel([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateSalesSummaryReportExcelAsync(storeId);
                var fileName = $"sales-summary-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Sales Summary Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Sales Summary Excel.");
            }
        }

        // GET api/reports/inventory-usage-trends/pdf?storeId=123
        [HttpGet("inventory-usage-trends/pdf")]
        public async Task<IActionResult> GetInventoryUsageTrendsPdf([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateInventoryUsageTrendsReportPdfAsync(storeId);
                var fileName = $"inventory-usage-trends-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Inventory Usage Trends PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Inventory Usage Trends PDF.");
            }
        }

        // GET api/reports/inventory-usage-trends/excel?storeId=123
        [HttpGet("inventory-usage-trends/excel")]
        public async Task<IActionResult> GetInventoryUsageTrendsExcel([FromQuery] int storeId)
        {
            if (storeId <= 0) return BadRequest("storeId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateInventoryUsageTrendsReportExcelAsync(storeId);
                var fileName = $"inventory-usage-trends-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Inventory Usage Trends Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Inventory Usage Trends Excel.");
            }
        }

        // GET api/reports/monthly-cogs/pdf?organizationId=123&year=2025&month=11
        [HttpGet("monthly-cogs/pdf")]
        public async Task<IActionResult> GetMonthlyCogsPdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateMonthlyCogsReportPdfAsync(organizationId, year, month);
                var fileName = $"monthly-cogs-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly COGS PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly COGS PDF.");
            }
        }

        // GET api/reports/monthly-cogs/excel?organizationId=123&year=2025&month=11
        [HttpGet("monthly-cogs/excel")]
        public async Task<IActionResult> GetMonthlyCogsExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateMonthlyCogsReportExcelAsync(organizationId, year, month);
                var fileName = $"monthly-cogs-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly COGS Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly COGS Excel.");
            }
        }

        // GET api/reports/monthly-gross-profit/pdf?organizationId=123&year=2025&month=11
        [HttpGet("monthly-gross-profit/pdf")]
        public async Task<IActionResult> GetMonthlyGrossProfitPdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateMonthlyGrossProfitReportPdfAsync(organizationId, year, month);
                var fileName = $"monthly-gross-profit-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly Gross Profit PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly Gross Profit PDF.");
            }
        }

        // GET api/reports/monthly-gross-profit/excel?organizationId=123&year=2025&month=11
        [HttpGet("monthly-gross-profit/excel")]
        public async Task<IActionResult> GetMonthlyGrossProfitExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateMonthlyGrossProfitReportExcelAsync(organizationId, year, month);
                var fileName = $"monthly-gross-profit-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly Gross Profit Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly Gross Profit Excel.");
            }
        }

        // GET api/reports/inventory-valuation/excel?organizationId=123
        [HttpGet("inventory-valuation/excel")]
        public async Task<IActionResult> GetInventoryValuationExcel([FromQuery] int organizationId)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            try
            {
                var bytes = await _reportRepository.GenerateInventoryValuationReportExcelAsync(organizationId);
                var fileName = $"inventory-valuation-{organizationId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate inventory valuation Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate inventory valuation Excel.");
            }
        }

// Add these two endpoints inside ReportsController

// GET api/reports/sales-by-recipe/pdf?organizationId=123&year=2025&month=11
[HttpGet("sales-by-recipe/pdf")]
public async Task<IActionResult> GetSalesByRecipePdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateSalesByRecipeReportPdfAsync(organizationId, year, month);
                var fileName = $"sales-by-recipe-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Sales by Recipe PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Sales by Recipe PDF.");
            }
        }

        // GET api/reports/sales-by-recipe/excel?organizationId=123&year=2025&month=11
        [HttpGet("sales-by-recipe/excel")]
        public async Task<IActionResult> GetSalesByRecipeExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");
            try
            {
                var bytes = await _reportRepository.GenerateSalesByRecipeReportExcelAsync(organizationId, year, month);
                var fileName = $"sales-by-recipe-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Sales by Recipe Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Sales by Recipe Excel.");
            }
        }

    }
}