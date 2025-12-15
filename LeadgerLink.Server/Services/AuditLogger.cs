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
        Task TrackChangesAsync(int? auditLogLevelId = null);
        Task LogExceptionAsync(string errorMessage, string? stackTrace = null);
        Task LogLoginAsync(string? details = null);
        Task LogLogoutAsync(string? details = null);
        Task LogAsync(string actionName, int? userId, string? affectedData, string? previousValue, string? currentValue, string? details, int? auditLogLevelId = null);
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

        public async Task TrackChangesAsync(int? auditLogLevelId = null)
        {
            var db = ResolveDbContext();
            var userId = ResolveUserId();

            var entries = db.ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Modified || e.State == EntityState.Added || e.State == EntityState.Deleted)
                .ToList();

            foreach (var entry in entries)
            {
                var previousValues = new Dictionary<string, object?>();
                var currentValues = new Dictionary<string, object?>();

                if (entry.State == EntityState.Modified)
                {
                    foreach (var property in entry.OriginalValues.Properties)
                    {
                        var original = entry.OriginalValues[property];
                        var current = entry.CurrentValues[property];
                        if (!Equals(original, current))
                        {
                            previousValues[property.Name] = original;
                            currentValues[property.Name] = current;
                        }
                    }
                }
                else if (entry.State == EntityState.Added)
                {
                    foreach (var property in entry.CurrentValues.Properties)
                    {
                        currentValues[property.Name] = entry.CurrentValues[property];
                    }
                }
                else if (entry.State == EntityState.Deleted)
                {
                    foreach (var property in entry.OriginalValues.Properties)
                    {
                        previousValues[property.Name] = entry.OriginalValues[property];
                    }
                }

                var log = new AuditLog
                {
                    Timestamp = DateTime.UtcNow,
                    OldValue = previousValues.Count > 0 ? JsonSerializer.Serialize(previousValues) : null,
                    NewValue = currentValues.Count > 0 ? JsonSerializer.Serialize(currentValues) : null,
                    Details = entry.State.ToString(),
                    ActionTypeId = MapActionType(entry.State),
                    AuditLogLevelId = auditLogLevelId,
                    UserId = userId
                };

                await _repo.AddAsync(log);
            }
        }

        public async Task LogExceptionAsync(string errorMessage, string? stackTrace = null)
        {
            var userId = ResolveUserId();
            var payload = new { errorMessage, stackTrace };
            var log = new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                OldValue = null,
                NewValue = JsonSerializer.Serialize(payload),
                Details = "Exception",
                ActionTypeId = MapActionType("Error"),
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
                Timestamp = DateTime.UtcNow,
                OldValue = null,
                NewValue = details,
                Details = "Login",
                ActionTypeId = MapActionType("Login"),
                // Login logs are generic (no specific level)
                AuditLogLevelId = null,
                UserId = ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        public async Task LogLogoutAsync(string? details = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                OldValue = null,
                NewValue = details,
                Details = "Logout",
                ActionTypeId = MapActionType("Logout"),
                // Logout logs are generic (no specific level)
                AuditLogLevelId = null,
                UserId = ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        public async Task LogAsync(string actionName, int? userId, string? affectedData, string? previousValue, string? currentValue, string? details, int? auditLogLevelId = null)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                OldValue = previousValue,
                NewValue = currentValue,
                Details = string.IsNullOrWhiteSpace(details) ? affectedData : details,
                ActionTypeId = MapActionType(actionName),
                AuditLogLevelId = auditLogLevelId,
                UserId = userId ?? ResolveUserId()
            };
            await _repo.AddAsync(log);
        }

        private int? MapActionType(EntityState state)
        {
            return state switch
            {
                EntityState.Added => MapActionType("create"),
                EntityState.Modified => MapActionType("edit"),
                EntityState.Deleted => MapActionType("delete"),
                _ => null
            };
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
                default: return null;
            }
        }
    }
}
