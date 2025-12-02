using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for notification operations.
    public class NotificationRepository : Repository<Notification>, INotificationRepository
    {
        private readonly LedgerLinkDbContext _context;

        public NotificationRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context;
        }

        // Return latest notifications for a specific user.
        public async Task<List<Notification>> GetLatestForUserAsync(int userId, int pageSize = 5)
        {
            if (pageSize < 1) pageSize = 1;
            const int MaxPageSize = 50;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            return await _context.Notifications
                .Include(n => n.NotificationType)
                .Include(n => n.User)
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(pageSize)
                .ToListAsync();
        }

        // Count unread notifications for a user.
        public async Task<int> CountUnreadForUserAsync(int userId)
        {
            return await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        // Mark a notification as read for the given user.
        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var n = await _context.Notifications.FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId);
            if (n == null) return;
            n.IsRead = true;
            n.CreatedAt = n.CreatedAt; // keep timestamp unchanged
            await _context.SaveChangesAsync();
        }

        // Count notifications based on filters.
        public async Task<int> CountAsync(string? type, DateTime? from, DateTime? to, int? organizationId)
        {
            var q = _context.Notifications
                .Include(n => n.NotificationType)
                .Include(n => n.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                q = q.Where(n => n.NotificationType != null && n.NotificationType.NotificationTypeName == type);
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

            return await q.CountAsync();
        }
    }
}