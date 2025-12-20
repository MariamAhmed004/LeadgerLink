using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager")]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        // Repository for fetching report data
        private readonly IReportRepository _reportRepository;

        // Repository for fetching user data
        private readonly IUserRepository _userRepository;

        // Repository for fetching inventory data
        private readonly IInventoryItemRepository _inventoryRepository;

        // Logger for logging dashboard operations
        private readonly ILogger<DashboardController> _logger;

        // Constructor to initialize dependencies
        public DashboardController(IReportRepository reportRepository, IUserRepository userRepository, IInventoryItemRepository inventoryRepository, ILogger<DashboardController> logger)
        {
            _reportRepository = reportRepository ?? throw new ArgumentNullException(nameof(reportRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _inventoryRepository = inventoryRepository ?? throw new ArgumentNullException(nameof(inventoryRepository));
            _logger = logger;
        }

        // GET api/dashboard/summary
        // Retrieves a summary of dashboard data for a store or organization.
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int months = 6, [FromQuery] int topN = 5, [FromQuery] int? storeId = null)
        {
            // ------------------------- Validate input -------------------------
            if (months < 1) months = 6;
            if (topN < 1) topN = 5;

            try
            {
                // ------------------------- Fetch user details -------------------------
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

                domainUser = await _userRepository.GetByIdRelationAsync(domainUser.UserId);

                if (domainUser == null) return Unauthorized();

                // ------------------------- Determine scope -------------------------
                var isStoreManager = string.Equals(domainUser.Role?.RoleTitle, "Store Manager", StringComparison.OrdinalIgnoreCase);
                int? effectiveStoreId = storeId ?? (isStoreManager ? domainUser.StoreId : null);

                var end = DateTime.UtcNow;
                var start = end.AddMonths(-months + 1);

                if (effectiveStoreId.HasValue)
                {
                    var sid = effectiveStoreId.Value;

                    // ------------------------- Fetch store-level data -------------------------
                    var topEmployees = await _reportRepository.GetTopEmployeesBySalesAsync(sid, topN);
                    var topProducts = await _reportRepository.GetTopProductsBySalesAsync(sid, topN);
                    var salesSeries = await _report_repository_getsalesseries(sid, months);
                    var itemsUtil = await _reportRepository.GetItemUtilizationAsync(sid, topN);
                    var invByCat = await _reportRepository.GetInventoryByCategoryAsync(sid);
                    var transfers = await _reportRepository.GetInventoryTransferCountsAsync(sid, start, end);
                    var mostSellingProductName = topProducts != null ? topProducts.FirstOrDefault()?.Name : null;

                    // Financials over period
                    decimal cogsPeriod = 0m;
                    decimal grossProfitPeriod = 0m;
                    for (int i = 0; i < months; i++)
                    {
                        var dt = start.AddMonths(i);
                        cogsPeriod += await _reportRepository.GetCOGSByStoreForMonthAsync(sid, dt.Year, dt.Month);
                        grossProfitPeriod += await _reportRepository.GetGrossProfitByStoreForMonthAsync(sid, dt.Year, dt.Month);
                    }

                    // Current inventory value
                    var inventoryValue = await _inventoryRepository.GetInventoryMonetaryValueByStoreAsync(sid);

                    // ------------------------- Return store-level result -------------------------
                    return Ok(new
                    {
                        scope = "store",
                        storeId = sid,
                        cogs = Math.Round(cogsPeriod, 3),
                        grossProfit = Math.Round(grossProfitPeriod, 3),
                        inventoryValue = Math.Round(inventoryValue, 3),
                        topEmployees,
                        topProducts,
                        mostSellingProductName,
                        salesSeries,
                        itemsUtil,
                        invByCat,
                        transfers
                    });
                }
                else
                {
                    var orgId = domainUser.OrgId;
                    if (!orgId.HasValue) return BadRequest("Unable to resolve user's organization.");

                    // ------------------------- Fetch organization-level data -------------------------
                    var topProducts = await _reportRepository.GetTopProductsBySalesForOrganizationAsync(orgId.Value, topN);
                    var salesSeries = await _reportRepository.GetOrganizationSalesSeriesAsync(orgId.Value, months);
                    var itemsUtil = await _reportRepository.GetItemUtilizationByOrganizationAsync(orgId.Value, topN);
                    var invByCat = await _reportRepository.GetInventoryByCategoryForOrganizationAsync(orgId.Value);
                    var transfers = await _reportRepository.GetInventoryTransferCountsForOrganizationAsync(orgId.Value, start, end);
                    var mostSellingProductName = topProducts != null ? topProducts.FirstOrDefault()?.Name : null;

                    // Org-level financials over period
                    decimal cogsPeriod = 0m;
                    decimal grossProfitPeriod = 0m;
                    for (int i = 0; i < months; i++)
                    {
                        var dt = start.AddMonths(i);
                        cogsPeriod += await _reportRepository.GetCOGSByOrganizationForMonthAsync(orgId.Value, dt.Year, dt.Month);
                        grossProfitPeriod += await _reportRepository.GetGrossProfitByOrganizationForMonthAsync(orgId.Value, dt.Year, dt.Month);
                    }

                    // Current inventory value for organization
                    var inventoryValue = await _inventoryRepository.GetInventoryMonetaryValueByOrganizationAsync(orgId.Value);

                    // New: sales contribution by store (org-level)
                    var salesContributionByStore = await _reportRepository.GetStoreSalesContributionForOrganizationAsync(orgId.Value, start, end);

                    var topEmployees = Array.Empty<ChartPointDto>();

                    // ------------------------- Return organization-level result -------------------------
                    return Ok(new
                    {
                        scope = "organization",
                        organizationId = orgId.Value,
                        cogs = Math.Round(cogsPeriod, 3),
                        grossProfit = Math.Round(grossProfitPeriod, 3),
                        inventoryValue = Math.Round(inventoryValue, 3),
                        topEmployees,
                        topProducts,
                        mostSellingProductName,
                        salesSeries,
                        itemsUtil,
                        invByCat,
                        transfers,
                        salesContributionByStore
                    });
                }
            }
            catch (Exception ex)
            {
                // ------------------------- Log error -------------------------
                _logger.LogError(ex, "Failed to build dashboard summary");
                return StatusCode(500, "Failed to build dashboard summary");
            }
        }

        // GET api/dashboard/store/summary
        // Retrieves a summary for a specific store.
        [HttpGet("store/summary")]
        public async Task<IActionResult> GetStoreSummary([FromQuery] int months = 6, [FromQuery] int topN = 5, [FromQuery] int? storeId = null)
        {
            // ------------------------- Delegate to GetSummary -------------------------
            return await GetSummary(months, topN, storeId);
        }

        // Helper method to fetch sales series data
        private async Task<TimeSeriesDto> _report_repository_getsalesseries(int storeId, int months)
        {
            var s = await _reportRepository.GetStoreSalesSeriesAsync(storeId, months);
            if (s == null) return new TimeSeriesDto { Labels = Array.Empty<string>(), Values = Array.Empty<decimal>() };
            return s;
        }
    }
}
