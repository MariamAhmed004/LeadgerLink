using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        // Repository for managing notification-related data
        private readonly INotificationRepository _repository;

        // Logger for logging errors and information
        private readonly ILogger<NotificationsController> _logger;

        // Repository for managing user-related data
        private readonly IUserRepository _userRepository;

        // Constructor to initialize dependencies
        public NotificationsController(INotificationRepository repository, ILogger<NotificationsController> logger, IUserRepository userRepository)
        {
            _repository = repository;
            _logger = logger;
            _userRepository = userRepository;
        }

        // GET api/notifications/latest?pageSize=5
        // Retrieves the latest notifications for the currently authenticated user.
        [Authorize]
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest([FromQuery] int pageSize = 5)
        {
            const int MaxPageSize = 50;

            // Validate page size
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            // Validate user authentication
            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            // Resolve user email
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return Ok(Array.Empty<object>());

            try
            {
                // Fetch the latest notifications
                var items = await _repository.GetLatestForUserAsync(domainUser.UserId, pageSize);

                // Map to lightweight DTO
                var dto = items.Select(n => new
                {
                    notificationId = n.NotificationId,
                    subject = n.Subject,
                    message = n.Message,
                    createdAt = n.CreatedAt,
                    isRead = n.IsRead,
                    userId = n.UserId,
                    notificationType = n.NotificationType != null ? new { notificationTypeName = n.NotificationType.NotificationTypeName } : null
                }).ToList();

                // Return the result
                return Ok(dto);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load latest notifications for user {UserId}", domainUser.UserId);
                return StatusCode(500, "Failed to load notifications");
            }
        }

        // GET api/notifications/{id}
        // Retrieves the details of a specific notification for the current user.
        [Authorize]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            // Validate user authentication
            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            // Resolve user email
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return NotFound();

            try
            {
                // Fetch the notification details
                var n = await _repository.GetByIdForUserAsync(id, domainUser.UserId);
                if (n == null) return NotFound();

                // Map to DTO
                var dto = new
                {
                    notificationId = n.NotificationId,
                    subject = n.Subject,
                    message = n.Message,
                    createdAt = n.CreatedAt,
                    isRead = n.IsRead,
                    userId = n.UserId,
                    notificationTypeName = n.NotificationType != null ? n.NotificationType.NotificationTypeName : null
                };

                // Return the result
                return Ok(dto);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load notification {NotificationId} for user {UserId}", id, domainUser.UserId);
                return StatusCode(500, "Failed to load notification");
            }
        }

        // POST api/notifications/{id}/read
        // Marks a specific notification as read for the current user.
        [Authorize]
        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            // Validate user authentication
            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            // Resolve user email
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return NotFound();

            try
            {
                // Mark the notification as read
                await _repository.MarkAsReadAsync(id, domainUser.UserId);
                return Ok();
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to mark notification {NotificationId} read for user {UserId}", id, domainUser.UserId);
                return StatusCode(500, "Failed to mark notification as read");
            }
        }

        // GET api/notifications/count
        // Counts the total number of notifications based on optional filters.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] string? type, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? organizationId)
        {
            try
            {
                // Fetch the count of notifications
                var total = await _repository.CountAsync(type, from, to, organizationId);

                // Return the result
                return Ok(total);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to count notifications");
                return StatusCode(500, "Failed to count notifications");
            }
        }


        // GET api/notifications/unread-count
        // Returns the count of unread notifications for the currently authenticated user.
        [Authorize]
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            // Ensure user is authenticated
            if (!User.Identity?.IsAuthenticated ?? true) return Unauthorized();

            // Resolve user email (fall back to Name if email claim not present)
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            // Fetch domain user
            var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return Ok(0);

            try
            {
                var count = await _repository.CountUnreadForUserAsync(domainUser.UserId);
                return Ok(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get unread notifications count for user {UserId}", domainUser.UserId);
                return StatusCode(500, "Failed to get unread notifications count");
            }
        }

    }
}