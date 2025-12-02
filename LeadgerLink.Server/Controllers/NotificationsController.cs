using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly INotificationRepository _repository;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(LedgerLinkDbContext context, INotificationRepository repository, ILogger<NotificationsController> logger)
        {
            _context = context;
            _repository = repository;
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

            try
            {
                var items = await _repository.GetLatestForUserAsync(domainUser.UserId, pageSize);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load latest notifications for user {UserId}", domainUser.UserId);
                return StatusCode(500, "Failed to load notifications");
            }
        }

        // GET api/notifications/count
        // Optional query: type (notification type string), from (yyyy-MM-dd), to (yyyy-MM-dd), organizationId (int)
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] string? type, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? organizationId)
        {
            try
            {
                var total = await _repository.CountAsync(type, from, to, organizationId);
                return Ok(total);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to count notifications");
                return StatusCode(500, "Failed to count notifications");
            }
        }

        // Optionally keep other notification endpoints here...
    }
}