using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/organizations")]
    public class OrganizationsController : ControllerBase
    {
        private readonly IOrganizationRepository _repository;
        private readonly IRepository<IndustryType> _industryRepo;
        private readonly ILogger<OrganizationsController> _logger;

        public OrganizationsController(
            IOrganizationRepository repository,
            IRepository<IndustryType> industryRepo,
            ILogger<OrganizationsController> logger)
        {
            _repository = repository;
            _industryRepo = industryRepo ?? throw new ArgumentNullException(nameof(industryRepo));
            _logger = logger;
        }

        // GET: api/organizations
        // Returns a projection appropriate for the client listing (includes industry type name + counts).
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrganizationListDto>>> GetAll()
        {
            var items = await _repository.GetListAsync();
            return Ok(items);
        }

        // NEW: GET api/organizations/industrytypes
        // Returns lightweight industry type list for client-side filters.
        [HttpGet("industrytypes")]
        public async Task<ActionResult<IEnumerable<object>>> GetIndustryTypes()
        {
            try
            {
                var list = await _industryRepo.GetAllAsync();
                var result = list
                    .Select(i => new
                    {
                        industryTypeId = i.IndustryTypeId,
                        industryTypeName = i.IndustryTypeName
                    })
                    .OrderBy(x => x.industryTypeName)
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load industry types");
                return StatusCode(500, "Failed to load industry types");
            }
        }

        // GET: api/organizations/{id}
        // Use repository projection that returns OrganizationDetailDto (includes counts and admin name).
        [HttpGet("{id:int}")]
        public async Task<ActionResult<OrganizationDetailDto>> GetById(int id)
        {
            var dto = await _repository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        // GET: api/organizations/by-user/{userId}
        [HttpGet("by-user/{userId:int}")]
        public async Task<ActionResult<Organization>> GetByUserId(int userId)
        {
            var org = await _repository.GetOrganizationByUserIdAsync(userId);
            if (org == null) return NotFound();
            return Ok(org);
        }

        // POST: api/organizations
        [HttpPost]
        public async Task<ActionResult<Organization>> Create([FromBody] Organization model)
        {
            if (model == null) return BadRequest();

            model.CreatedAt = DateTime.UtcNow;

            var created = await _repository.AddAsync(model);
            return CreatedAtAction(nameof(GetById), new { id = created.OrgId }, created);
        }

        // PUT: api/organizations/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Organization model)
        {
            if (model == null || id != model.OrgId) return BadRequest();

            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            // map updatable fields
            existing.OrgName = model.OrgName;
            existing.Email = model.Email;
            existing.Phone = model.Phone;
            existing.RegestirationNumber = model.RegestirationNumber;
            existing.EstablishmentDate = model.EstablishmentDate;
            existing.WebsiteUrl = model.WebsiteUrl;
            existing.IndustryTypeId = model.IndustryTypeId;
            existing.IsActive = model.IsActive;

            await _repository.UpdateAsync(existing);
            return NoContent();
        }

        // GET: api/organizations/count
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count()
        {
            // Count all organizations using the repository count method.
            var total = await _repository.CountAsync(o => true);
            return Ok(total);
        }
    }
}
