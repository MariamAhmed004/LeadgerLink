using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/auditlogs")]
    public class AuditLogsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly ILogger<AuditLogsController> _logger;

        public AuditLogsController(LedgerLinkDbContext context, ILogger<AuditLogsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET api/auditlogs/count
        // Optional query: actionType (string), from (yyyy-MM-dd), to (yyyy-MM-dd)
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] string? actionType, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var q = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                q = q.Where(a =>
                    a.ActionTypeId == actionType
                    || a.ActionType != null && a.ActionType.ActionType1 == actionType);
            }

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(a => a.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(a => a.Timestamp <= toDate);
            }

            var total = await q.CountAsync();
            return Ok(total);
        }

        // GET api/auditlogs/overview
        // Returns brief rows for the dashboard table. Supports paging and optional filters.
        [HttpGet("overview")]
        public async Task<ActionResult<IEnumerable<AuditLogOverviewDto>>> GetOverview(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? actionType = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var q = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.ActionType)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(actionType))
            {
                q = q.Where(a =>
                    a.ActionTypeId == actionType
                    || a.ActionType != null && a.ActionType.ActionType1 == actionType);
            }

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(a => a.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(a => a.Timestamp <= toDate);
            }

            var items = await q
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogOverviewDto
                {
                    AuditLogId = a.AuditLogId,
                    Timestamp = a.Timestamp,
                    UserId = a.UserId,
                    UserName = a.User != null ? (a.User.UserFirstname + " " + a.User.UserLastname).Trim() : null,
                    ActionType = a.ActionType != null ? a.ActionType.ActionType1 : a.ActionTypeId,
                    Details = a.Details
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/auditlogs/{id}
        // Returns full audit log details.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AuditLogDto>> GetById(int id)
        {
            var a = await _context.AuditLogs
                .Include(x => x.User)
                .Include(x => x.ActionType)
                .Include(x => x.AuditLogLevel)
                .FirstOrDefaultAsync(x => x.AuditLogId == id);

            if (a == null) return NotFound();

            var dto = new AuditLogDto
            {
                AuditLogId = a.AuditLogId,
                Timestamp = a.Timestamp,
                UserId = a.UserId,
                UserName = a.User != null ? (a.User.UserFirstname + " " + a.User.UserLastname).Trim() : null,
                ActionType = a.ActionType != null ? a.ActionType.ActionType1 : a.ActionTypeId,
                AuditLogLevel = a.AuditLogLevel != null ? a.AuditLogLevel.AuditLogLevel1 : a.AuditLogLevelId,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Details = a.Details
            };

            return Ok(dto);
        }
    }
}
