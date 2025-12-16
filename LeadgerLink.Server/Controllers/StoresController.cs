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
using LeadgerLink.Server.Contexts;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/stores")]
    public class StoresController : ControllerBase
    {
        // Repository for managing store-related data
        private readonly IStoreRepository _repository;

        // Repository for managing operational status-related data
        private readonly IRepository<OperationalStatus> _lookupRepository;

        // Repository for managing user-related data
        private readonly IUserRepository _userRepository;

        // Repository for managing organization-related data
        private readonly IOrganizationRepository _organizationRepository;

        // Logger for logging errors and information
        private readonly ILogger<StoresController> _logger;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Constructor to initialize dependencies
        public StoresController(
            IStoreRepository repository,
            IRepository<OperationalStatus> lookupRepository,
            IUserRepository userRepository,
            IOrganizationRepository organizationRepository,
            ILogger<StoresController> logger,
            IAuditContext auditContext)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
            _lookupRepository = lookupRepository ?? throw new ArgumentNullException(nameof(lookupRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _organizationRepository = organizationRepository ?? throw new ArgumentNullException(nameof(organizationRepository));
            _logger = logger;
            _auditContext = auditContext;
        }

        // GET: api/stores
        // Retrieves all stores with manager name and operational status.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            // Fetch all stores with related data
            var stores = await _repository.GetAllWithRelationsAsync();

            // Map stores to lightweight DTOs
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

            // Return the result
            return Ok(dto);
        }

        // GET api/stores/operationalstatuses
        // Retrieves all operational statuses.
        [HttpGet("operationalstatuses")]
        public async Task<ActionResult<IEnumerable<object>>> GetOperationalStatuses()
        {
            try
            {
                // Fetch all operational statuses
                var statuses = await _lookupRepository.GetAllAsync();

                // Map statuses to lightweight DTOs
                var list = statuses
                    .Select(s => new
                    {
                        operationalStatusId = s.OperationalStatusId,
                        operationalStatusName = s.OperationalStatusName
                    })
                    .ToList();

                // Return the result
                return Ok(list);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load operational statuses");
                return StatusCode(500, "Failed to load operational statuses");
            }
        }

        // GET: api/stores/by-organization/{organizationId}
        // Retrieves stores for a specific organization with manager name and operational status.
        [HttpGet("by-organization/{organizationId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetByOrganization(int organizationId)
        {
            // Fetch stores for the specified organization
            var stores = await _repository.GetAllWithRelationsAsync(organizationId);

            // Map stores to lightweight DTOs
            var filtered = stores
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

            // Return the result
            return Ok(filtered);
        }

        // GET: api/stores/count
        // Counts the total number of stores with an optional organization filter.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int? organizationId)
        {
            // Count stores based on the organization filter
            if (organizationId.HasValue)
            {
                var c = await _repository.CountAsync(s => s.OrgId == organizationId.Value);
                return Ok(c);
            }

            // Count all stores if no filter is provided
            var total = await _repository.CountAsync(s => true);
            return Ok(total);
        }

        // POST: api/stores
        // Creates a new store for the authenticated user's organization.
        [Authorize(Roles = "Organization Admin")]
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] StoreCreateDto dto)
        {
            // Validate the input DTO
            if (dto == null) return BadRequest("Request body is required.");

            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Resolve user email
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            await SetAuditContextUserId();

            try
            {
                // Resolve the organization for the authenticated user
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

                // Map DTO to entity
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

                // Add the store to the repository
                var created = await _repository.AddAsync(model);

                // Map the created store to a DTO
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

                // Return the created store
                return CreatedAtAction(nameof(GetById), new { id = created.StoreId }, resultDto);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to create store for user {Email}", email);
                return StatusCode(500, "Failed to create store");
            }
        }

        // GET: api/stores/{id}
        // Retrieves detailed information about a specific store.
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            // Fetch the store details
            var store = await _repository.GetByIdWithRelationsAsync(id);
            if (store == null) return NotFound();

            // Map the store to a DTO
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

            // Return the result
            return Ok(dto);
        }

        // PUT: api/stores/{id}
        // Updates an existing store.
        [Authorize(Roles = "Organization Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Store model)
        {
            // Validate the input model and store ID
            if (model == null || id != model.StoreId) return BadRequest();

            // Fetch the existing store
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await SetAuditContextUserId();

            // Update store fields
            existing.StoreName = model.StoreName;
            existing.Location = model.Location;
            existing.Email = model.Email;
            existing.PhoneNumber = model.PhoneNumber;
            existing.OpeningDate = model.OpeningDate;
            existing.OperationalStatusId = model.OperationalStatusId;
            existing.WorkingHours = model.WorkingHours;
            existing.UpdatedAt = DateTime.UtcNow;

            // Update the store in the repository
            await _repository.UpdateAsync(existing);
            return NoContent();
        }

        // Helper to get organization by user ID with safe error handling.
        private async Task<Organization?> _organization_repository_get(int userId)
        {
            try
            {
                // Fetch the organization for the specified user ID
                return await _organizationRepository.GetOrganizationByUserIdAsync(userId);
            }
            catch (Exception ex)
            {
                // Log the error and return null
                _logger.LogError(ex, "Failed to get organization for user {UserId}", userId);
                return null;
            }
        }

        // Resolves the user ID from the current user's claims.
        private async Task<int?> ResolveUserIdAsync()
        {
            // Extract the email from the user's claims or identity
            var email = User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User?.Identity?.Name;

            // Return null if the email is missing or invalid
            if (string.IsNullOrWhiteSpace(email)) return null;

            // Fetch the user from the repository using the email
            var user = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            // Return the user ID if the user exists, otherwise return null
            return user?.UserId;
        }

        // Sets the audit context user ID based on the current user's claims.
        private async Task SetAuditContextUserId()
        {
            // Resolve the user ID and set it in the audit context
            _auditContext.UserId = await ResolveUserIdAsync();
        }
    }
}
