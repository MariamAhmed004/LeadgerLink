using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// AuditLogger setup summary (for future reference):
// - ActionTypeId mapping (fixed ids):
//   1=login, 2=logout, 3=create, 4=edit, 5=delete, 6=generate.
// - Levels:
//   * Exceptions => application-level (AuditLogLevelId=1 currently; adjust if your lookup differs).
//   * Login/Logout => level=null (generic).
//   * TrackChangesAsync / LogAsync accept optional auditLogLevelId for org/app level when needed.
// - Usage:
//   * EF-backed add/edit/delete: call TrackChangesAsync(level) right before SaveChangesAsync.
//   * Non-EF or extra-context actions: call LogAsync("generate" | "create" | etc., ... level).
//   * Helpers: LogLoginAsync(details), LogLogoutAsync(details), LogExceptionAsync(message, stack).
// - ResolveUserId uses HttpContext claims to set UserId in logs.
// - Next steps: wire specific AuditLogLevel ids, enrich Details, include IP/UserAgent if needed.

namespace LeadgerLink.Server.Services
{
    public interface IAuditLogger
    {
        Task LogExceptionAsync(string errorMessage, string? stackTrace = null);
        Task LogLoginAsync(string? details = null);
        Task LogLogoutAsync(string? details = null);
        Task LogAsync(string actionName, int? userId, string? affectedData, string? previousValue, string? currentValue, string? details, int? auditLogLevelId = null);
        Task LogPasswordResetAsync(string action, string email, string? details = null);
    }

    // Optional change-tracking + convenience logger
    public class AuditLogger : IAuditLogger
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IAuditLogRepository _repo;
        private readonly IHttpContextAccessor _http;

        public AuditLogger(IServiceProvider serviceProvider, IAuditLogRepository repo, IHttpContextAccessor http)
        {
            _serviceProvider = serviceProvider;
            _repo = repo;
            _http = http;
        }

        private LedgerLinkDbContext ResolveDbContext()
        {
            return _serviceProvider.GetRequiredService<LedgerLinkDbContext>();
        }

        private int? ResolveUserId()
        {
            try
            {
                var email = _http.HttpContext?.User?.Claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value
                            ?? _http.HttpContext?.User?.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return null;

                var db = ResolveDbContext();
                var user = db.Users.FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                return user?.UserId;
            }
            catch { return null; }
        }

     
        public async Task LogExceptionAsync(string errorMessage, string? stackTrace = null)
        {
            var userId = ResolveUserId();
            var payload = new { errorMessage, stackTrace };
            var log = new AuditLog
            {
                Timestamp = DateTime.Now,
                OldValue = null,
                NewValue = JsonSerializer.Serialize(payload),
                Details = "Exception",
                ActionTypeId = MapActionType("exception"),
                // Exceptions are application-level audit logs
                AuditLogLevelId = 1,
                UserId = userId
            };
            await _repo.AddAsync(log);
        }

        public async Task LogLoginAsync(string? details = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.Now,
                OldValue = null,
                NewValue = details,
                Details = "Login",
                ActionTypeId = MapActionType("Login"),
                // Login logs are set to application-level  
                AuditLogLevelId = 1,
                UserId = ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        public async Task LogLogoutAsync(string? details = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.Now,
                OldValue = null,
                NewValue = details,
                Details = "Logout",
                ActionTypeId = MapActionType("Logout"),
                // Logout logs are set to application-level
                AuditLogLevelId = 1,
                UserId = ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        public async Task LogAsync(string actionName, int? userId, string? affectedData, string? previousValue, string? currentValue, string? details, int? auditLogLevelId = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.Now,
                OldValue = previousValue,
                NewValue = currentValue,
                Details = string.IsNullOrWhiteSpace(details) ? affectedData : details,
                ActionTypeId = MapActionType(actionName),
                AuditLogLevelId = auditLogLevelId,
                UserId = userId ?? ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        // Logs password reset actions (e.g., request or completion).
        public async Task LogPasswordResetAsync(string action, string email, string? details = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.Now,
                OldValue = null,
                NewValue = details,
                Details = $"{action} for {email}",
                ActionTypeId = MapActionType("edit"), 
                AuditLogLevelId = 1, // set to application-level for security-related actions
                UserId = ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        private int? MapActionType(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return null;
            switch (name.Trim().ToLowerInvariant())
            {
                case "login": return 1;
                case "logout": return 2;
                case "create": return 3;
                case "edit": return 4;
                case "delete": return 5;
                case "generate": return 6;
                case "exception": return 1007;
                default: return null;
            }
        }
    }
}
