using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly IReportRepository _reportRepository;
        private readonly LedgerLinkDbContext _context;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(IReportRepository reportRepository, LedgerLinkDbContext context, ILogger<DashboardController> logger)
        {
            _reportRepository = reportRepository ?? throw new ArgumentNullException(nameof(reportRepository));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger;
        }

        // GET api/dashboard/summary?months=6&topN=5&storeId=optional
        // If storeId is omitted/null, returns aggregated organization-level summary for the current user's organization,
        // except when the current user is a Store Manager, then defaults to their store.
        [Authorize]
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int months = 6, [FromQuery] int topN = 5, [FromQuery] int? storeId = null)
        {
            if (months < 1) months = 6;
            if (topN < 1) topN = 5;

            try
            {
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var domainUser = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (domainUser == null) return Unauthorized();

                // Determine default scope: if explicit storeId provided, use store-level.
                // Else if user is Store Manager and has a StoreId, use that store.
                // Otherwise aggregate organization-level.
                var isStoreManager = string.Equals(domainUser.Role?.RoleTitle, "Store Manager", StringComparison.OrdinalIgnoreCase);
                int? effectiveStoreId = storeId ?? (isStoreManager ? domainUser.StoreId : null);

                var end = DateTime.UtcNow;
                var start = end.AddMonths(-months + 1);

                if (effectiveStoreId.HasValue)
                {
                    var sid = effectiveStoreId.Value;

                    // Core charts/data
                    var topEmployees = await _reportRepository.GetTopEmployeesBySalesAsync(sid, topN);
                    var topProducts = await _reportRepository.GetTopProductsBySalesAsync(sid, topN);
                    var salesSeries = await _report_repository_getsalesseries(sid, months);
                    var itemsUtil = await _reportRepository.GetItemUtilizationAsync(sid, topN);
                    var invByCat = await _reportRepository.GetInventoryByCategoryAsync(sid);
                    var transfers = await _reportRepository.GetInventoryTransferCountsAsync(sid, start, end);
                    var mostSellingProductName = topProducts != null ? topProducts.FirstOrDefault()?.Name : null;

                    // Financials over period (sum each month)
                    decimal cogsPeriod = 0m;
                    decimal grossProfitPeriod = 0m;
                    for (int i = 0; i < months; i++)
                    {
                        var dt = start.AddMonths(i);
                        cogsPeriod += await _reportRepository.GetCOGSByStoreForMonthAsync(sid, dt.Year, dt.Month);
                        grossProfitPeriod += await _reportRepository.GetGrossProfitByStoreForMonthAsync(sid, dt.Year, dt.Month);
                    }

                    // Current inventory value (sum quantity * cost)
                    var inventoryValue = await _context.InventoryItems
                        .Where(ii => ii.StoreId == sid)
                        .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m;

                    return Ok(new
                    {
                        scope = "store",
                        storeId = sid,
                        // financials
                        cogs = Math.Round(cogsPeriod, 3),
                        grossProfit = Math.Round(grossProfitPeriod, 3),
                        inventoryValue = Math.Round(inventoryValue, 3),
                        // charts/series
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
                    var inventoryValue = await _context.InventoryItems
                        .Include(ii => ii.Store)
                        .Where(ii => ii.Store != null && ii.Store.OrgId == orgId.Value)
                        .SumAsync(ii => (decimal?)(ii.Quantity * ii.CostPerUnit)) ?? 0m;

                    // New: sales contribution by store (org-level)
                    var salesContributionByStore = await _reportRepository.GetStoreSalesContributionForOrganizationAsync(orgId.Value, start, end);

                    var topEmployees = Array.Empty<ChartPointDto>(); // not aggregated at org-level

                    return Ok(new
                    {
                        scope = "organization",
                        organizationId = orgId.Value,
                        // financials
                        cogs = Math.Round(cogsPeriod, 3),
                        grossProfit = Math.Round(grossProfitPeriod, 3),
                        inventoryValue = Math.Round(inventoryValue, 3),
                        // charts/series
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
                _logger.LogError(ex, "Failed to build dashboard summary");
                return StatusCode(500, "Failed to build dashboard summary");
            }
        }

        // Back-compat: store-only endpoint (kept but recommend using /summary)
        [Authorize]
        [HttpGet("store/summary")]
        public async Task<IActionResult> GetStoreSummary([FromQuery] int months = 6, [FromQuery] int topN = 5, [FromQuery] int? storeId = null)
        {
            if (!storeId.HasValue)
            {
                // delegate to aggregated summary when no store provided
                return await GetSummary(months, topN, storeId);
            }

            return await GetSummary(months, topN, storeId);
        }

        // helper wrapper to catch potential nulls from repo
        private async Task<TimeSeriesDto> _report_repository_getsalesseries(int storeId, int months)
        {
            var s = await _reportRepository.GetStoreSalesSeriesAsync(storeId, months);
            if (s == null) return new TimeSeriesDto { Labels = Array.Empty<string>(), Values = Array.Empty<decimal>() };
            return s;
        }
    }
}
