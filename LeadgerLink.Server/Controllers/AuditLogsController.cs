using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;

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

        // Constructor to initialize dependencies
        public AuditLogsController(IAuditLogRepository auditRepo, ILogger<AuditLogsController> logger)
        {
            _auditRepo = auditRepo ?? throw new ArgumentNullException(nameof(auditRepo));
            _logger = logger;
        }

        // GET api/auditlogs/count
        // Counts the total number of audit logs based on optional filters.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count(
            [FromQuery] int? actionTypeId,
            [FromQuery] string? actionTypeName,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? organizationId)
        {
            // ------------------------- Fetch total count -------------------------
            var total = await _auditRepo.CountAsync(actionTypeId, actionTypeName, from, to, organizationId);

            // ------------------------- Return result -------------------------
            return Ok(total);
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
            // ------------------------- Validate input -------------------------
            if (page < 1) page = 1;

            const int DefaultPageSize = 10;
            const int MaxPageSize = 50;

            if (pageSize < 1) pageSize = DefaultPageSize;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            // ------------------------- Fetch overview -------------------------
            var items = await _auditRepo.GetOverviewAsync(page, pageSize, actionTypeId, actionTypeName, from, to, organizationId);

            // ------------------------- Return result -------------------------
            return Ok(items);
        }

        // GET api/auditlogs/{id}
        // Retrieves a detailed audit log by its ID.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AuditLogDto>> GetById(int id)
        {
            // ------------------------- Fetch audit log -------------------------
            var dto = await _auditRepo.GetByIdAsync(id);

            // ------------------------- Return result -------------------------
            if (dto == null) return NotFound();
            return Ok(dto);
        }
    }
}
