using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/stores")]
    public class StoresController : ControllerBase
    {
        private readonly IStoreRepository _repository;
        private readonly IRepository<OperationalStatus> _lookupRepository;
        private readonly IUserRepository _userRepository;
        private readonly IOrganizationRepository _organizationRepository;
        private readonly ILogger<StoresController> _logger;

        public StoresController(
            IStoreRepository repository,
            IRepository<OperationalStatus> lookupRepository,
            IUserRepository userRepository,
            IOrganizationRepository organizationRepository,
            ILogger<StoresController> logger)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _lookupRepository = lookupRepository ?? throw new ArgumentNullException(nameof(lookupRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _organizationRepository = organizationRepository ?? throw new ArgumentNullException(nameof(organizationRepository));
            _logger = logger;
        }

        // GET: api/stores
        // Return all stores (projection). Consumers may rely on manager name and operational status in client logic.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var stores = await _repository.GetAllWithRelationsAsync();

            var dto = stores.Select(s => new
            {
                storeId = s.StoreId,
                storeName = s.StoreName,
                location = s.Location,
                workingHours = s.WorkingHours,
                operationalStatusId = s.OperationalStatus != null ? s.OperationalStatus.OperationalStatusId : s.OperationalStatusId,
                operationalStatusName = s.OperationalStatus != null ? s.OperationalStatus.OperationalStatusName : null,
                managerName = s.User != null ? ((s.User.UserFirstname ?? "") + " " + (s.User.UserLastname ?? "")).Trim() : null,
                userId = s.UserId
            });

            return Ok(dto);
        }

        // GET api/stores/operationalstatuses
        // Uses the generic repository to fetch operational statuses.
        [HttpGet("operationalstatuses")]
        public async Task<ActionResult<IEnumerable<object>>> GetOperationalStatuses()
        {
            try
            {
                var statuses = await _lookupRepository.GetAllAsync();
                var list = statuses
                    .Select(s => new
                    {
                        operationalStatusId = s.OperationalStatusId,
                        operationalStatusName = s.OperationalStatusName
                    })
                    .ToList();

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load operational statuses");
                return StatusCode(500, "Failed to load operational statuses");
            }
        }

        // GET: api/stores/by-organization/{organizationId}
        // Return stores for a specific organization including manager name and operational status name.
        [HttpGet("by-organization/{organizationId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetByOrganization(int organizationId)
        {
            // Use repository method that includes relations and filter server-side to ensure required nav props are available.
            var stores = await _repository.GetAllWithRelationsAsync();

            var filtered = stores
                .Where(s => s.OrgId == organizationId)
                .Select(s => new
                {
                    storeId = s.StoreId,
                    storeName = s.StoreName,
                    location = s.Location,
                    workingHours = s.WorkingHours,
                    operationalStatusId = s.OperationalStatus != null ? s.OperationalStatus.OperationalStatusId : s.OperationalStatusId,
                    operationalStatusName = s.OperationalStatus != null ? s.OperationalStatus.OperationalStatusName : null,
                    managerName = s.User != null ? ((s.User.UserFirstname ?? "") + " " + (s.User.UserLastname ?? "")).Trim() : null,
                    userId = s.UserId
                })
                .ToList();

            return Ok(filtered);
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
        // Create a store. No server-side validation of DTO fields per request.
        // OrgId is resolved from the currently authenticated user server-side.
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] StoreCreateDto dto)
        {
            if (dto == null) return BadRequest("Request body is required.");

            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            try
            {
                // Resolve domain user and organization for the caller
                var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                int? resolvedOrgId = null;

                if (domainUser != null && domainUser.OrgId.HasValue)
                {
                    resolvedOrgId = domainUser.OrgId.Value;
                }
                else if (domainUser != null)
                {
                    var org = await _organization_repository_get(domainUser.UserId);
                    if (org != null) resolvedOrgId = org.OrgId;
                }

                if (!resolvedOrgId.HasValue)
                {
                    return BadRequest("Unable to determine organization for the current user.");
                }

                // Map DTO -> entity. Do not perform server-side validation of DTO fields.
                var model = new Store
                {
                    StoreName = dto.StoreName?.Trim(),
                    OperationalStatusId = dto.OperationalStatusId,
                    Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email!.Trim(),
                    PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber!.Trim(),
                    UserId = dto.UserId,
                    OpeningDate = dto.OpeningDate,
                    WorkingHours = string.IsNullOrWhiteSpace(dto.WorkingHours) ? null : dto.WorkingHours,
                    Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location,
                    OrgId = resolvedOrgId.Value,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var created = await _repository.AddAsync(model);

                var resultDto = new
                {
                    storeId = created.StoreId,
                    storeName = created.StoreName,
                    location = created.Location,
                    orgId = created.OrgId,
                    userId = created.UserId,
                    email = created.Email,
                    phoneNumber = created.PhoneNumber,
                    openingDate = created.OpeningDate,
                    workingHours = created.WorkingHours,
                    createdAt = created.CreatedAt,
                    updatedAt = created.UpdatedAt
                };

                return CreatedAtAction(nameof(GetById), new { id = created.StoreId }, resultDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create store for user {Email}", email);
                return StatusCode(500, "Failed to create store");
            }
        }

        // helper to get organization by user id with safe error handling
        private async Task<Organization?> _organization_repository_get(int userId)
        {
            try
            {
                return await _organizationRepository.GetOrganizationByUserIdAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get organization for user {UserId}", userId);
                return null;
            }
        }

        // GET: api/stores/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            var store = await _repository.GetByIdWithRelationsAsync(id);
            if (store == null) return NotFound();

            var dto = new
            {
                storeId = store.StoreId,
                storeName = store.StoreName,
                location = store.Location,
                orgId = store.OrgId,
                userId = store.UserId,
                userName = store.User != null ? (store.User.UserFirstname + " " + store.User.UserLastname).Trim() : null,
                email = store.Email,
                phoneNumber = store.PhoneNumber,
                openingDate = store.OpeningDate,
                operationalStatusName = store.OperationalStatus != null ? store.OperationalStatus.OperationalStatusName : null,
                workingHours = store.WorkingHours,
                createdAt = store.CreatedAt,
                updatedAt = store.UpdatedAt
            };

            return Ok(dto);
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


    }
}
