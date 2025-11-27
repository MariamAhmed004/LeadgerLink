using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/sales")]
    public class SalesController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;

        public SalesController(LedgerLinkDbContext context)
        {
            _context = context;
        }

        // GET api/sales/sum?organizationId=5&from=2025-11-27&to=2025-11-27
        // Returns the sum of TotalAmount for sales belonging to stores of the specified organization.
        // Optional from/to filter by date (YYYY-MM-DD). If omitted, all matching rows are summed.
        [HttpGet("sum")]
        public async Task<ActionResult<decimal>> Sum(
            [FromQuery] int organizationId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var q = _context.Sales
                .Include(s => s.Store)
                .AsQueryable();

            q = q.Where(s => s.Store != null && s.Store.OrgId == organizationId);

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(s => s.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(s => s.Timestamp <= toDate);
            }

            var sum = await q.SumAsync(s => (decimal?)s.TotalAmount);
            return Ok(sum ?? 0m);
        }
    }
}