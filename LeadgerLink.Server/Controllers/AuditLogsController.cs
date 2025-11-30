using System;
using System.Collections.Generic;
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
        // Optional query: actionTypeId (int), actionTypeName (string), from (yyyy-MM-dd), to (yyyy-MM-dd), organizationId (int)
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count(
            [FromQuery] int? actionTypeId,
            [FromQuery] string? actionTypeName,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? organizationId)
        {
            var q = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.ActionType)
                .AsQueryable();

            // Prefer numeric id filter when provided
            if (actionTypeId.HasValue)
            {
                q = q.Where(a => a.ActionTypeId == actionTypeId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(actionTypeName))
            {
                q = q.Where(a => a.ActionType != null && a.ActionType.ActionTypeName == actionTypeName);
            }

            if (organizationId.HasValue)
            {
                q = q.Where(a => a.User != null && a.User.OrgId == organizationId.Value);
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
        // Returns brief rows for the dashboard table. Supports paging and optional filters including organizationId.
        [HttpGet("overview")]
        public async Task<ActionResult<IEnumerable<AuditLogOverviewDto>>> GetOverview(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] int? actionTypeId = null,
            [FromQuery] string? actionTypeName = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] int? organizationId = null)
        {
            if (page < 1) page = 1;

            const int DefaultPageSize = 10;
            const int MaxPageSize = 50;

            if (pageSize < 1) pageSize = DefaultPageSize;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            var q = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.ActionType)
                .AsQueryable();

            // Prefer numeric id filter when provided
            if (actionTypeId.HasValue)
            {
                q = q.Where(a => a.ActionTypeId == actionTypeId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(actionTypeName))
            {
                q = q.Where(a => a.ActionType != null && a.ActionType.ActionTypeName == actionTypeName);
            }

            if (organizationId.HasValue)
            {
                q = q.Where(a => a.User != null && a.User.OrgId == organizationId.Value);
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
                    // ActionType is returned as display string: prefer ActionType.ActionTypeName, otherwise fallback to numeric id as string
                    ActionType = a.ActionType != null ? a.ActionType.ActionTypeName : a.ActionTypeId.ToString(),
                    Details = a.Details
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET api/auditlogs/{id}
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
                // prefer action type name, fallback to numeric id string
                ActionType = a.ActionType != null ? a.ActionType.ActionTypeName : a.ActionTypeId.ToString(),
                // prefer level name, fallback to numeric id string
                AuditLogLevel = a.AuditLogLevel != null ? a.AuditLogLevel.AuditLogLevelName : a.AuditLogLevelId.ToString(),
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Details = a.Details
            };

            return Ok(dto);
        }
    }
}
