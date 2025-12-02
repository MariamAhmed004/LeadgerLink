using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly LedgerLinkDbContext _context;

        public AuditLogRepository(LedgerLinkDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<int> CountAsync(int? actionTypeId, string? actionTypeName, DateTime? from, DateTime? to, int? organizationId)
        {
            var q = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.ActionType)
                .AsQueryable();

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

            return await q.CountAsync();
        }

        public async Task<IEnumerable<AuditLogOverviewDto>> GetOverviewAsync(
            int page,
            int pageSize,
            int? actionTypeId,
            string? actionTypeName,
            DateTime? from,
            DateTime? to,
            int? organizationId)
        {
            var q = _context.AuditLogs
                .Include(a => a.User)
                .Include(a => a.ActionType)
                .AsQueryable();

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
                    ActionType = a.ActionType != null ? a.ActionType.ActionTypeName : a.ActionTypeId.ToString(),
                    Details = a.Details
                })
                .ToListAsync();

            return items;
        }

        public async Task<AuditLogDto?> GetByIdAsync(int id)
        {
            var a = await _context.AuditLogs
                .Include(x => x.User)
                .Include(x => x.ActionType)
                .Include(x => x.AuditLogLevel)
                .FirstOrDefaultAsync(x => x.AuditLogId == id);

            if (a == null) return null;

            var dto = new AuditLogDto
            {
                AuditLogId = a.AuditLogId,
                Timestamp = a.Timestamp,
                UserId = a.UserId,
                UserName = a.User != null ? (a.User.UserFirstname + " " + a.User.UserLastname).Trim() : null,
                ActionType = a.ActionType != null ? a.ActionType.ActionTypeName : a.ActionTypeId.ToString(),
                AuditLogLevel = a.AuditLogLevel != null ? a.AuditLogLevel.AuditLogLevelName : a.AuditLogLevelId.ToString(),
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Details = a.Details
            };

            return dto;
        }
    }
}
