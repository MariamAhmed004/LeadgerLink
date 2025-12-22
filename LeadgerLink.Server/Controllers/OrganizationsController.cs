using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using LeadgerLink.Server.Dtos.OrganizationDtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/organizations")]
    public class OrganizationsController : ControllerBase
    {
        // Repository for managing organization-related data
        private readonly IOrganizationRepository _repository;

        // Repository for managing industry type-related data
        private readonly IRepository<IndustryType> _industryRepo;

        // Logger for logging errors and information
        private readonly ILogger<OrganizationsController> _logger;

        // Constructor to initialize dependencies
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
        // Retrieves a list of organizations with industry type names and counts.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrganizationListDto>>> GetAll()
        {
            // Fetch the list of organizations
            var items = await _repository.GetListAsync();

            // Return the result
            return Ok(items);
        }

        // GET api/organizations/industrytypes
        // Retrieves a list of industry types for client-side filters.
        [HttpGet("industrytypes")]
        public async Task<ActionResult<IEnumerable<object>>> GetIndustryTypes()
        {
            try
            {
                // Fetch the list of industry types
                var list = await _industryRepo.GetAllAsync();

                // Map to lightweight DTO
                var result = list
                    .Select(i => new
                    {
                        industryTypeId = i.IndustryTypeId,
                        industryTypeName = i.IndustryTypeName
                    })
                    .OrderBy(x => x.industryTypeName)
                    .ToList();

                // Return the result
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load industry types");
                return StatusCode(500, "Failed to load industry types");
            }
        }

        // GET: api/organizations/{id}
        // Retrieves detailed information about a specific organization.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<OrganizationDetailDto>> GetById(int id)
        {
            // Fetch the organization details
            var dto = await _repository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();

            // Return the result
            return Ok(dto);
        }

        // GET: api/organizations/by-user/{userId}
        // Retrieves the organization associated with a specific user.
        [HttpGet("by-user/{userId:int}")]
        public async Task<ActionResult<Organization>> GetByUserId(int userId)
        {
            // Fetch the organization by user ID
            var org = await _repository.GetOrganizationByUserIdAsync(userId);
            if (org == null) return NotFound();

            // Return the result
            return Ok(org);
        }

        // POST: api/organizations
        // Creates a new organization.
        [Authorize(Roles = "Application Admin")]
        [HttpPost]
        public async Task<ActionResult<OrganizationDetailDto>> Create(
            [FromBody][Bind("OrgName,Email,Phone,IndustryTypeId,RegestirationNumber,EstablishmentDate,WebsiteUrl,IsActive")] OrganizationDetailDto dto)
        {
            // Validate the input DTO
            if (dto == null) return BadRequest("Request body is required.");
            if (string.IsNullOrWhiteSpace(dto.OrgName) ||
                string.IsNullOrWhiteSpace(dto.Email) ||
                string.IsNullOrWhiteSpace(dto.Phone))
            {
                return BadRequest("OrgName, Email and Phone are required.");
            }
            if (!dto.IndustryTypeId.HasValue)
            {
                return BadRequest("IndustryTypeId is required.");
            }

            // Validate the industry type
            var industry = await _industryRepo.GetByIdAsync(dto.IndustryTypeId.Value);
            if (industry == null) return BadRequest("Selected industry type does not exist.");

            // Map the DTO to the entity
            var model = new Organization
            {
                OrgName = dto.OrgName!.Trim(),
                Email = dto.Email!.Trim(),
                Phone = dto.Phone!.Trim(),
                IndustryTypeId = dto.IndustryTypeId.Value,
                RegestirationNumber = string.IsNullOrWhiteSpace(dto.RegestirationNumber) ? null : dto.RegestirationNumber!.Trim(),
                EstablishmentDate = dto.EstablishmentDate,
                WebsiteUrl = string.IsNullOrWhiteSpace(dto.WebsiteUrl) ? null : dto.WebsiteUrl!.Trim(),
                IsActive = dto is { } && dto.StoresCount >= 0 ? true : true,
                CreatedAt = DateTime.UtcNow
            };

            // Add the organization and fetch the details
            var created = await _repository.AddAsync(model);
            var detail = await _repository.GetDetailByIdAsync(created.OrgId);

            // Return the created organization
            return CreatedAtAction(nameof(GetById), new { id = created.OrgId }, detail);
        }

        // PUT: api/organizations/{id}
        // Updates an existing organization.
        [Authorize(Roles = "Application Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Organization model)
        {
            // Validate the input model and ID
            if (model == null || id != model.OrgId) return BadRequest();

            // Fetch the existing organization
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            // Map updatable fields
            existing.OrgName = model.OrgName;
            existing.Email = model.Email;
            existing.Phone = model.Phone;
            existing.RegestirationNumber = model.RegestirationNumber;
            existing.EstablishmentDate = model.EstablishmentDate;
            existing.WebsiteUrl = model.WebsiteUrl;
            existing.IndustryTypeId = model.IndustryTypeId;
            existing.IsActive = model.IsActive;

            // Update the organization
            await _repository.UpdateAsync(existing);
            return NoContent();
        }

        // GET: api/organizations/count
        // Counts the total number of organizations.
        [Authorize(Roles = "Application Admin")]
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count()
        {
            // Fetch the count of organizations
            var total = await _repository.CountAsync(o => true);

            // Return the result
            return Ok(total);
        }
    }
}
