using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Dtos.AuditLogDtos;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    /// <summary>
    /// Repository surface for audit log read operations.
    /// Keeps the same projections used by controllers (overview and detail DTOs).
    /// </summary>
    public interface IAuditLogRepository : IRepository<AuditLog>
    {
        /// <summary>
        /// Count audit log rows matching provided optional filters.
        /// </summary>
        Task<int> CountAsync(int? actionTypeId, string? actionTypeName, DateTime? from, DateTime? to, int? organizationId);

        /// <summary>
        /// Return paged overview rows for audit logs using the same projection as the controller.
        /// Controller is responsible for page/pageSize validation; repository performs the query.
        /// </summary>
        Task<IEnumerable<AuditLogOverviewDto>> GetOverviewAsync(
            int page,
            int pageSize,
            int? actionTypeId,
            string? actionTypeName,
            DateTime? from,
            DateTime? to,
            int? organizationId,
            bool isApplicationAdmin);

        /// <summary>
        /// Get a single audit log detail DTO by id (or null when not found).
        /// </summary>
        Task<AuditLogDto?> GetByIdAsync(int id);
    }
}
