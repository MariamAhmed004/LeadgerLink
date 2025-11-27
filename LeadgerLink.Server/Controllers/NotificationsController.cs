using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(LedgerLinkDbContext context, ILogger<NotificationsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET api/notifications/latest?pageSize=5
        // Returns latest notifications for the currently authenticated user.
        [Authorize]
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest([FromQuery] int pageSize = 5)
        {
            const int MaxPageSize = 50;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return Ok(Array.Empty<Notification>());

            var items = await _context.Notifications
                .Include(n => n.NotificationType)
                .Where(n => n.UserId == domainUser.UserId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(pageSize)
                .ToListAsync();

            return Ok(items);
        }

        // GET api/notifications/count
        // Optional query: type (notification type string), from (yyyy-MM-dd), to (yyyy-MM-dd), organizationId (int)
        // Counts notifications matching filters (server-side).
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] string? type, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? organizationId)
        {
            var q = _context.Notifications
                .Include(n => n.NotificationType)
                .Include(n => n.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                q = q.Where(n => n.NotificationType != null && n.NotificationType.NotificationType1 == type);
            }

            if (organizationId.HasValue)
            {
                q = q.Where(n => n.User != null && n.User.OrgId == organizationId.Value);
            }

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(n => n.CreatedAt >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(n => n.CreatedAt <= toDate);
            }

            var total = await q.CountAsync();
            return Ok(total);
        }

        // Optionally keep other notification endpoints here...
    }
}