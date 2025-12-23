using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using LeadgerLink.Server.Dtos.AuditLogDtos;
using LeadgerLink.Server.Services;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Application Admin,Organization Admin")]
    [Route("api/auditlogs")]
    public class AuditLogsController : ControllerBase
    {
        // Repository for accessing audit log data
        private readonly IAuditLogRepository _auditRepo;

        // Logger for logging controller operations
        private readonly ILogger<AuditLogsController> _logger;

        // Audit logger for logging exceptions
        private readonly IAuditLogger _auditLogger;

        // Constructor to initialize dependencies
        public AuditLogsController(IAuditLogRepository auditRepo, ILogger<AuditLogsController> logger, IAuditLogger auditLogger)
        {
            _auditRepo = auditRepo ?? throw new ArgumentNullException(nameof(auditRepo));
            _logger = logger;
            _auditLogger = auditLogger;
        }

        // GET api/auditlogs/count
        // Counts the total number of audit logs based on optional filters.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count(
            [FromQuery] int? actionTypeId,
            // Accept both "actionType" (legacy/client) and "actionTypeName" (existing API param)
            [FromQuery(Name = "actionType")] string? actionType,
            [FromQuery(Name = "actionTypeName")] string? actionTypeName,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? organizationId)
        {
            try
            {
                // Normalize to a single name value: prefer explicit actionTypeName, fall back to actionType query key
                var effectiveActionTypeName = !string.IsNullOrWhiteSpace(actionTypeName) ? actionTypeName : actionType;

                // ------------------------- Fetch total count -------------------------
                var total = await _auditRepo.CountAsync(actionTypeId, effectiveActionTypeName, from, to, organizationId);

                // ------------------------- Return result -------------------------
                return Ok(total);
            }
            catch (Exception ex)
            {
                // Log the exception
                try { await _auditLogger.LogExceptionAsync("Failed to count audit logs", ex.StackTrace); } catch { }
                return StatusCode(500, "An error occurred while counting audit logs.");
            }
        }

        // GET api/auditlogs/overview
        // Retrieves an overview of audit logs for the dashboard table.
        [HttpGet("overview")]
        public async Task<ActionResult<IEnumerable<AuditLogOverviewDto>>> GetOverview(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] int? actionTypeId = null,
            [FromQuery] string? actionTypeName = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] int? organizationId = null)
        {
            try
            {
                // ------------------------- Validate input -------------------------
                if (page < 1) page = 1;

                const int DefaultPageSize = 10;
                const int MaxPageSize = 50;

                if (pageSize < 1) pageSize = DefaultPageSize;
                pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

                // ------------------------- Check if user is Application Admin -------------------------
                var isApplicationAdmin = User.IsInRole("Application Admin");


                // ------------------------- Fetch overview -------------------------
                var items = await _auditRepo.GetOverviewAsync(
                    page,
                    pageSize,
                    actionTypeId,
                    actionTypeName,
                    from,
                    to,
                    organizationId,
                    isApplicationAdmin // Pass the boolean to the repository
                );

                // ------------------------- Return result -------------------------
                return Ok(items);
            }
            catch (Exception ex)
            {
                // Log the exception
                try { await _auditLogger.LogExceptionAsync("Failed to retrieve audit log overview", ex.StackTrace); } catch { }
                return StatusCode(500, "An error occurred while retrieving audit log overview.");
            }
        }

        // GET api/auditlogs/{id}
        // Retrieves a detailed audit log by its ID.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AuditLogDto>> GetById(int id)
        {
            try
            {
                // ------------------------- Fetch audit log -------------------------
                var dto = await _auditRepo.GetByIdAsync(id);

                // ------------------------- Return result -------------------------
                if (dto == null) return NotFound();
                return Ok(dto);
            }
            catch (Exception ex)
            {
                // Log the exception
                try { await _auditLogger.LogExceptionAsync("Failed to retrieve audit log by ID", ex.StackTrace); } catch { }
                return StatusCode(500, "An error occurred while retrieving the audit log.");
            }
        }
    }
}
