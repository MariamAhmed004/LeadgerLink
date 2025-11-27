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
    [Route("api/stores")]
    public class StoresController : ControllerBase
    {
        private readonly IStoreRepository _repository;
        private readonly ILogger<StoresController> _logger;

        public StoresController(IStoreRepository repository, ILogger<StoresController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // GET: api/stores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Store>>> GetAll()
        {
            var stores = await _repository.GetAllAsync();
            return Ok(stores);
        }

        // GET: api/stores/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Store>> GetById(int id)
        {
            var store = await _repository.GetByIdAsync(id);
            if (store == null) return NotFound();
            return Ok(store);
        }

        // GET: api/stores/by-organization/{organizationId}
        [HttpGet("by-organization/{organizationId:int}")]
        public async Task<ActionResult<IEnumerable<Store>>> GetByOrganization(int organizationId)
        {
            var stores = await _repository.GetStoresByOrganizationAsync(organizationId);
            return Ok(stores);
        }

        // GET: api/stores/count
        // Optional query parameter: organizationId
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int? organizationId)
        {
            if (organizationId.HasValue)
            {
                var c = await _repository.CountAsync(s => s.OrgId == organizationId.Value);
                return Ok(c);
            }

            var total = await _repository.CountAsync(s => true);
            return Ok(total);
        }

        // POST: api/stores
        [HttpPost]
        public async Task<ActionResult<Store>> Create([FromBody] Store model)
        {
            if (model == null) return BadRequest();

            model.CreatedAt = DateTime.UtcNow;
            model.UpdatedAt = DateTime.UtcNow;

            var created = await _repository.AddAsync(model);
            return CreatedAtAction(nameof(GetById), new { id = created.StoreId }, created);
        }

        // PUT: api/stores/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Store model)
        {
            if (model == null || id != model.StoreId) return BadRequest();

            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.StoreName = model.StoreName;
            existing.Location = model.Location;
            existing.Email = model.Email;
            existing.PhoneNumber = model.PhoneNumber;
            existing.OpeningDate = model.OpeningDate;
            existing.OperationalStatusId = model.OperationalStatusId;
            existing.WorkingHours = model.WorkingHours;
            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(existing);
            return NoContent();
        }

        // DELETE: api/stores/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await _repository.Delete(existing);
            return NoContent();
        }
    }
}
