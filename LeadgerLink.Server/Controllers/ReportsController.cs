using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        // Repository for managing report-related data
        private readonly IReportRepository _reportRepository;

        // Logger for logging errors and information
        private readonly ILogger<ReportsController> _logger;

        // Constructor to initialize dependencies
        public ReportsController(IReportRepository reportRepository, ILogger<ReportsController> logger)
        {
            _reportRepository = reportRepository ?? throw new ArgumentNullException(nameof(reportRepository));
            _logger = logger;
        }

        // -------------------------
        // Empty Reports
        // -------------------------

        // GET api/reports/generate?reportId=...&format=PDF|Excel|CSV&organizationId=...&storeId=...
        // Generates a report in the specified format (PDF, Excel, or CSV).
        [HttpGet("generate")]
        public async Task<IActionResult> Generate([FromQuery] string reportId, [FromQuery] string format, [FromQuery] int? organizationId, [FromQuery] int? storeId)
        {
            // Validate input parameters
            if (string.IsNullOrWhiteSpace(reportId) || string.IsNullOrWhiteSpace(format))
            {
                return BadRequest("reportId and format are required.");
            }

            try
            {
                // Determine the requested format
                var fmt = format.Trim().ToLowerInvariant();

                if (fmt == "pdf")
                {
                    // Generate PDF report
                    var bytes = await _reportRepository.GenerateReportPdfAsync(reportId, organizationId, storeId);
                    var fileName = $"{reportId}.pdf";
                    var contentType = "application/pdf";
                    return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
                }

                if (fmt == "excel" || fmt == "csv")
                {
                    // Generate CSV report (placeholder for Excel and CSV)
                    var bytes = await _reportRepository.GenerateReportCsvAsync(reportId, organizationId, storeId);
                    var ext = "csv";
                    var fileName = $"{reportId}.{ext}";
                    var contentType = "text/csv";
                    return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
                }

                // Return error for unsupported formats
                return BadRequest($"Unsupported format '{format}'. Supported: PDF, Excel, CSV.");
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate report {ReportId} format {Format}", reportId, format);
                return StatusCode(500, "Failed to generate report.");
            }
        }

        // -------------------------
        // Store Manager Reports
        // -------------------------

        // -------------------------
        // Current Stock
        // -------------------------

        // GET api/reports/current-stock/pdf?storeId=123
        // Generates a current stock report in PDF format for the specified store.
        [HttpGet("current-stock/pdf")]
        public async Task<IActionResult> GetCurrentStockPdf([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the current stock report in PDF format
                var bytes = await _reportRepository.GenerateCurrentStockReportPdfAsync(storeId);
                var fileName = $"current-stock-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate current stock PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate current stock PDF.");
            }
        }

        // GET api/reports/current-stock/excel?storeId=123
        // Generates a current stock report in Excel format for the specified store.
        [HttpGet("current-stock/excel")]
        public async Task<IActionResult> GetCurrentStockExcel([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the current stock report in Excel format
                var bytes = await _reportRepository.GenerateCurrentStockReportExcelAsync(storeId);
                var fileName = $"current-stock-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate current stock Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate current stock Excel.");
            }
        }

        // -------------------------
        // Top Recipes & Sales
        // -------------------------

        // GET api/reports/top-recipes-sales/pdf?storeId=123
        // Generates a top recipes sales report in PDF format for the specified store.
        [HttpGet("top-recipes-sales/pdf")]
        public async Task<IActionResult> GetTopRecipesSalesPdf([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the top recipes sales report in PDF format
                var bytes = await _reportRepository.GenerateTopRecipesSalesReportPdfAsync(storeId);
                var fileName = $"top-recipes-sales-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Top Recipes & Sales PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Recipes & Sales PDF.");
            }
        }

        // GET api/reports/top-recipes-sales/excel?storeId=123
        // Generates a top recipes sales report in Excel format for the specified store.
        [HttpGet("top-recipes-sales/excel")]
        public async Task<IActionResult> GetTopRecipesSalesExcel([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the top recipes sales report in Excel format
                var bytes = await _reportRepository.GenerateTopRecipesSalesReportExcelAsync(storeId);
                var fileName = $"top-recipes-sales-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Top Recipes & Sales Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Recipes & Sales Excel.");
            }
        }


        // -------------------------
        // Top Employee
        // -------------------------

        // GET api/reports/top-employee/pdf?storeId=123
        // Generates a top employee report in PDF format for the specified store.
        [HttpGet("top-employee/pdf")]
        public async Task<IActionResult> GetTopEmployeePdf([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the top employee report in PDF format
                var bytes = await _reportRepository.GenerateTopEmployeeReportPdfAsync(storeId);
                var fileName = $"top-employee-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Top Employee PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Employee PDF.");
            }
        }

        // GET api/reports/top-employee/excel?storeId=123
        // Generates a top employee report in Excel format for the specified store.
        [HttpGet("top-employee/excel")]
        public async Task<IActionResult> GetTopEmployeeExcel([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the top employee report in Excel format
                var bytes = await _reportRepository.GenerateTopEmployeeReportExcelAsync(storeId);
                var fileName = $"top-employee-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Top Employee Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Top Employee Excel.");
            }
        }


        // -------------------------
        // Sales Summary
        // -------------------------


        // GET api/reports/sales-summary/pdf?storeId=123
        // Generates a sales summary report in PDF format for the specified store.
        [HttpGet("sales-summary/pdf")]
        public async Task<IActionResult> GetSalesSummaryPdf([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the sales summary report in PDF format
                var bytes = await _reportRepository.GenerateSalesSummaryReportPdfAsync(storeId);
                var fileName = $"sales-summary-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Sales Summary PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Sales Summary PDF.");
            }
        }

        // GET api/reports/sales-summary/excel?storeId=123
        // Generates a sales summary report in Excel format for the specified store.
        [HttpGet("sales-summary/excel")]
        public async Task<IActionResult> GetSalesSummaryExcel([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the sales summary report in Excel format
                var bytes = await _reportRepository.GenerateSalesSummaryReportExcelAsync(storeId);
                var fileName = $"sales-summary-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Sales Summary Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Sales Summary Excel.");
            }
        }



        // -------------------------
        // Inventory Usage Trends
        // -------------------------


        // GET api/reports/inventory-usage-trends/pdf?storeId=123
        // Generates an inventory usage trends report in PDF format for the specified store.
        [HttpGet("inventory-usage-trends/pdf")]
        public async Task<IActionResult> GetInventoryUsageTrendsPdf([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the inventory usage trends report in PDF format
                var bytes = await _reportRepository.GenerateInventoryUsageTrendsReportPdfAsync(storeId);
                var fileName = $"inventory-usage-trends-{storeId}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Inventory Usage Trends PDF for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Inventory Usage Trends PDF.");
            }
        }


        // GET api/reports/inventory-usage-trends/excel?storeId=123
        // Generates an inventory usage trends report in Excel format for the specified store.
        [HttpGet("inventory-usage-trends/excel")]
        public async Task<IActionResult> GetInventoryUsageTrendsExcel([FromQuery] int storeId)
        {
            // Validate input parameters
            if (storeId <= 0) return BadRequest("storeId is required.");

            try
            {
                // Generate the inventory usage trends report in Excel format
                var bytes = await _reportRepository.GenerateInventoryUsageTrendsReportExcelAsync(storeId);
                var fileName = $"inventory-usage-trends-{storeId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Inventory Usage Trends Excel for store {StoreId}", storeId);
                return StatusCode(500, "Failed to generate Inventory Usage Trends Excel.");
            }
        }

        // -------------------------
        // Accountant Reports
        // -------------------------

        // -------------------------
        // Monthly COGS
        // -------------------------

        // GET api/reports/monthly-cogs/pdf?organizationId=123&year=2025&month=11
        // Generates a monthly COGS report in PDF format for the specified organization.
        [HttpGet("monthly-cogs/pdf")]
        public async Task<IActionResult> GetMonthlyCogsPdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly COGS report in PDF format
                var bytes = await _reportRepository.GenerateMonthlyCogsReportPdfAsync(organizationId, year, month);
                var fileName = $"monthly-cogs-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate monthly COGS PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly COGS PDF.");
            }
        }

        // GET api/reports/monthly-cogs/excel?organizationId=123&year=2025&month=11
        // Generates a monthly COGS report in Excel format for the specified organization.
        [HttpGet("monthly-cogs/excel")]
        public async Task<IActionResult> GetMonthlyCogsExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly COGS report in Excel format
                var bytes = await _reportRepository.GenerateMonthlyCogsReportExcelAsync(organizationId, year, month);
                var fileName = $"monthly-cogs-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate monthly COGS Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly COGS Excel.");
            }
        }

        // -------------------------
        // Monthly Gross Profit
        // -------------------------

        // GET api/reports/monthly-gross-profit/pdf?organizationId=123&year=2025&month=11
        // Generates a monthly gross profit report in PDF format for the specified organization.
        [HttpGet("monthly-gross-profit/pdf")]
        public async Task<IActionResult> GetMonthlyGrossProfitPdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly gross profit report in PDF format
                var bytes = await _reportRepository.GenerateMonthlyGrossProfitReportPdfAsync(organizationId, year, month);
                var fileName = $"monthly-gross-profit-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate monthly Gross Profit PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly Gross Profit PDF.");
            }
        }

        // GET api/reports/monthly-gross-profit/excel?organizationId=123&year=2025&month=11
        // Generates a monthly gross profit report in Excel format for the specified organization.
        [HttpGet("monthly-gross-profit/excel")]
        public async Task<IActionResult> GetMonthlyGrossProfitExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly gross profit report in Excel format
                var bytes = await _reportRepository.GenerateMonthlyGrossProfitReportExcelAsync(organizationId, year, month);
                var fileName = $"monthly-gross-profit-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate monthly Gross Profit Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate monthly Gross Profit Excel.");
            }
        }


        // -------------------------
        // Inventory Valuation
        // -------------------------

        // GET api/reports/inventory-valuation/excel?organizationId=123
        // Generates an inventory valuation report in Excel format for the specified organization.
        [HttpGet("inventory-valuation/excel")]
        public async Task<IActionResult> GetInventoryValuationExcel([FromQuery] int organizationId)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");

            try
            {
                // Generate the inventory valuation report in Excel format
                var bytes = await _reportRepository.GenerateInventoryValuationReportExcelAsync(organizationId);
                var fileName = $"inventory-valuation-{organizationId}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate inventory valuation Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate inventory valuation Excel.");
            }
        }


        // -------------------------
        // Sales by Recipe
        // -------------------------

        // GET api/reports/sales-by-recipe/pdf?organizationId=123&year=2025&month=11
        // Generates a sales by recipe report in PDF format for the specified organization.
        [HttpGet("sales-by-recipe/pdf")]
        public async Task<IActionResult> GetSalesByRecipePdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the sales by recipe report in PDF format
                var bytes = await _reportRepository.GenerateSalesByRecipeReportPdfAsync(organizationId, year, month);
                var fileName = $"sales-by-recipe-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Sales by Recipe PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Sales by Recipe PDF.");
            }
        }

        // GET api/reports/sales-by-recipe/excel?organizationId=123&year=2025&month=11
        // Generates a sales by recipe report in Excel format for the specified organization.
        [HttpGet("sales-by-recipe/excel")]
        public async Task<IActionResult> GetSalesByRecipeExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the sales by recipe report in Excel format
                var bytes = await _reportRepository.GenerateSalesByRecipeReportExcelAsync(organizationId, year, month);
                var fileName = $"sales-by-recipe-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Sales by Recipe Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Sales by Recipe Excel.");
            }
        }


        // -------------------------
        // Monthly Sales
        // -------------------------


        // GET api/reports/monthly-sales/pdf?organizationId=123&year=2025&month=11
        // Generates a monthly sales report in PDF format for the specified organization.
        [HttpGet("monthly-sales/pdf")]
        public async Task<IActionResult> GetMonthlySalesPdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly sales report in PDF format
                var bytes = await _reportRepository.GenerateMonthlySalesReportPdfAsync(organizationId, year, month);
                var fileName = $"monthly-sales-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Monthly Sales PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Monthly Sales PDF.");
            }
        }

        // GET api/reports/monthly-sales/excel?organizationId=123&year=2025&month=11
        // Generates a monthly sales report in Excel format for the specified organization.
        [HttpGet("monthly-sales/excel")]
        public async Task<IActionResult> GetMonthlySalesExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            // Validate input parameters
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                // Generate the monthly sales report in Excel format
                var bytes = await _reportRepository.GenerateMonthlySalesReportExcelAsync(organizationId, year, month);
                var fileName = $"monthly-sales-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to generate Monthly Sales Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Monthly Sales Excel.");
            }
        }

        // GET /api/reports/store-performance/excel?organizationId=&year=&month=
        [HttpGet("store-performance/excel")]
        public async Task<IActionResult> StorePerformanceExcel(int organizationId, int year, int month)
        {
            var bytes = await _reportRepository.GenerateStorePerformanceReportExcelAsync(organizationId, year, month);
            var filename = $"store-performance-{organizationId}-{year}-{month}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename);
        }

        // GET /api/reports/store-performance/pdf?organizationId=&year=&month=
        [HttpGet("store-performance/pdf")]
        public async Task<IActionResult> StorePerformancePdf(int organizationId, int year, int month)
        {
            var bytes = await _reportRepository.GenerateStorePerformanceReportPdfAsync(organizationId, year, month);
            var filename = $"store-performance-{organizationId}-{year}-{month}.pdf";
            return File(bytes, "application/pdf", filename);
        }

        // Add these two controller actions to ReportsController (paste among other GET endpoints near other organization-level admin report routes)

        // GET api/reports/employee-sales-performance/pdf?organizationId=123&year=2025&month=11
        [HttpGet("employee-sales-performance/pdf")]
        public async Task<IActionResult> GetEmployeeSalesPerformancePdf([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                var bytes = await _reportRepository.GenerateEmployeeSalesPerformanceReportPdfAsync(organizationId, year, month);
                var fileName = $"employee-sales-performance-{organizationId}-{year}-{month}.pdf";
                return File(bytes ?? Array.Empty<byte>(), "application/pdf", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Employee Sales Performance PDF for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Employee Sales Performance PDF.");
            }
        }

        // GET api/reports/employee-sales-performance/excel?organizationId=123&year=2025&month=11
        [HttpGet("employee-sales-performance/excel")]
        public async Task<IActionResult> GetEmployeeSalesPerformanceExcel([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] int month)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");
            if (year <= 0 || month < 1 || month > 12) return BadRequest("Valid year and month are required.");

            try
            {
                var bytes = await _reportRepository.GenerateEmployeeSalesPerformanceReportExcelAsync(organizationId, year, month);
                var fileName = $"employee-sales-performance-{organizationId}-{year}-{month}.xlsx";
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return File(bytes ?? Array.Empty<byte>(), contentType, fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate Employee Sales Performance Excel for org {OrgId}", organizationId);
                return StatusCode(500, "Failed to generate Employee Sales Performance Excel.");
            }
        }


    }
}