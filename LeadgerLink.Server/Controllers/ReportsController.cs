using System;
using System.Threading.Tasks;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
    }
}