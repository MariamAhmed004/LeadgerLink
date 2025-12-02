using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/auditlogs")]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogRepository _auditRepo;
        private readonly ILogger<AuditLogsController> _logger;

        public AuditLogsController(IAuditLogRepository auditRepo, ILogger<AuditLogsController> logger)
        {
            _auditRepo = auditRepo ?? throw new ArgumentNullException(nameof(auditRepo));
            _logger = logger;
        }

        // GET api/auditlogs/count
        // Optional query: actionTypeId (int), actionTypeName (string), from (yyyy-MM-dd), to (yyyy-MM-dd), organizationId (int)
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count(
            [FromQuery] int? actionTypeId,
            [FromQuery] string? actionTypeName,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? organizationId)
        {
            var total = await _auditRepo.CountAsync(actionTypeId, actionTypeName, from, to, organizationId);
            return Ok(total);
        }

        // GET api/auditlogs/overview
        // Returns brief rows for the dashboard table. Supports paging and optional filters including organizationId.
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
            if (page < 1) page = 1;

            const int DefaultPageSize = 10;
            const int MaxPageSize = 50;

            if (pageSize < 1) pageSize = DefaultPageSize;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            var items = await _auditRepo.GetOverviewAsync(page, pageSize, actionTypeId, actionTypeName, from, to, organizationId);
            return Ok(items);
        }

        // GET api/auditlogs/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AuditLogDto>> GetById(int id)
        {
            var dto = await _auditRepo.GetByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }
    }
}
