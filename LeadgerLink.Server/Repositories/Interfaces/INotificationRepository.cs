using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    /// <summary>
    /// Repository surface for notification read operations used by controllers.
    /// Keeps controller logic and route behavior unchanged; moves EF queries into repository.
    /// </summary>
    public interface INotificationRepository
    {
        /// <summary>
        /// Return the latest notifications for a specific user, limited by pageSize (ordered desc by CreatedAt).
        /// </summary>
        Task<List<Notification>> GetLatestForUserAsync(int userId, int pageSize);

        /// <summary>
        /// Count notifications matching optional filters (type, from/to date range, organization).
        /// </summary>
        Task<int> CountAsync(string? type, DateTime? from, DateTime? to, int? organizationId);
    }
}