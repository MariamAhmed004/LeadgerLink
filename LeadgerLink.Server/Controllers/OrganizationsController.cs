using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/organizations")]
    public class OrganizationsController : ControllerBase
    {
        private readonly IOrganizationRepository _repository;
        private readonly ILogger<OrganizationsController> _logger;

        public OrganizationsController(IOrganizationRepository repository, ILogger<OrganizationsController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // GET: api/organizations
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Organization>>> GetAll()
        {
            var items = await _repository.GetAllAsync();
            return Ok(items);
        }

        // GET: api/organizations/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Organization>> GetById(int id)
        {
            var org = await _repository.GetByIdAsync(id);
            if (org == null) return NotFound();
            return Ok(org);
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

        // DELETE: api/organizations/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await _repository.Delete(existing);
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
