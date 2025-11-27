using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Notification-specific queries.
    public interface INotificationRepository : IRepository<Notification>
    {
        // Return latest notifications for a specific user.
        Task<IEnumerable<Notification>> GetLatestForUserAsync(int userId, int pageSize = 10);

        // Count unread notifications for a user.
        Task<int> CountUnreadForUserAsync(int userId);

        // Mark a notification as read for the given user.
        Task MarkAsReadAsync(int notificationId, int userId);
    }
}