using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        // Manager for handling identity user operations
        private readonly UserManager<ApplicationUser> _userManager;

        // Repository for managing user-related data
        private readonly IUserRepository _userRepository;

        // Repository for managing role-related data
        private readonly IRepository<Role> _roleRepository;

        // Repository for managing store-related data
        private readonly IStoreRepository _storeRepository;

        // Logger for logging errors and information
        private readonly ILogger<UsersController> _logger;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Constructor to initialize dependencies
        public UsersController(
            UserManager<ApplicationUser> userManager,
            IUserRepository userRepository,
            IRepository<Role> roleRepository,
            IStoreRepository storeRepository,
            ILogger<UsersController> logger,
            IAuditContext auditContext)
        {
            _userManager = userManager;
            _userRepository = userRepository;
            _roleRepository = roleRepository ?? throw new ArgumentNullException(nameof(roleRepository));
            _storeRepository = storeRepository ?? throw new ArgumentNullException(nameof(storeRepository));
            _logger = logger;
            _auditContext = auditContext;
        }

        // GET: api/users
        // Retrieves a list of users with optional filters for organization and store.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDetailDto>>> GetAll([FromQuery] int? orgId = null, [FromQuery] int? storeId = null)
        {
            // Fetch the list of users
            var list = await _userRepository.GetListAsync();

            // Apply organization filter if provided
            if (orgId.HasValue)
                list = list.Where(u => (u.OrgId ?? 0) == orgId.Value).ToList();

            // Apply store filter if provided
            if (storeId.HasValue)
                list = list.Where(u => (u.StoreId ?? 0) == storeId.Value).ToList();

            // Return the result
            return Ok(list);
        }

        // GET: api/users/{id}
        // Retrieves detailed information about a specific user.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<UserDetailDto>> GetById(int id)
        {
            // Fetch the user details
            var dto = await _userRepository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();

            // Return the result
            return Ok(dto);
        }

        // GET: api/users/count
        // Counts the total number of users with an optional organization filter.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int? orgId)
        {
            // Count users based on the organization filter
            if (orgId.HasValue)
            {
                var c = await _userRepository.CountAsync(u => u.OrgId == orgId.Value);
                return Ok(c);
            }

            // Count all users if no filter is provided
            var total = await _userRepository.CountAsync(u => true);
            return Ok(total);
        }

        // PUT: api/users/{id}
        // Updates basic profile fields for a specific user.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
        {
            // Validate the input DTO
            if (dto == null) return BadRequest("Invalid payload.");

            // Fetch the existing user
            var existing = await _userRepository.GetByIdRelationAsync(id);
            if (existing == null) return NotFound();

            // Validate input fields
            if (!string.IsNullOrWhiteSpace(dto.FirstName) && dto.FirstName.Trim().Length < 2)
                return BadRequest("First name must be at least 2 characters.");
            if (!string.IsNullOrWhiteSpace(dto.LastName) && dto.LastName.Trim().Length < 2)
                return BadRequest("Last name must be at least 2 characters.");
            if (!string.IsNullOrWhiteSpace(dto.Phone) && dto.Phone.Trim().Length < 3)
                return BadRequest("Phone must be at least 3 characters.");

            // Update user fields
            existing.UserFirstname = string.IsNullOrWhiteSpace(dto.FirstName) ? existing.UserFirstname : dto.FirstName!.Trim();
            existing.UserLastname = string.IsNullOrWhiteSpace(dto.LastName) ? existing.UserLastname : dto.LastName!.Trim();
            existing.Phone = dto.Phone == null ? existing.Phone : dto.Phone!.Trim();
            existing.IsActive = dto.IsActive;

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Handle store manager reassignment logic
            if (dto.StoreId.HasValue)
            {
                if (dto.ReassignStoreManager == true && existing.Role != null && existing.Role.RoleTitle == "Store Manager")
                {
                   
                    // Reassign the store manager
                    await _storeRepository.ReassignStoreManagerAsync(id, existing.StoreId, dto.StoreId);
                }

                // Update the store ID
                existing.StoreId = dto.StoreId.Value;
            }

            // Update the user
            existing.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(existing);
            return NoContent();
        }

        // POST: api/users
        // Creates both an Identity user and a domain user record.
        [HttpPost]
        public async Task<IActionResult> AddUser([FromBody] AddUserDto model)
        {
            // Validate the input model
            if (model == null) return BadRequest("Request body is required.");

            // Validate required fields
            if (string.IsNullOrWhiteSpace(model.Username) ||
                string.IsNullOrWhiteSpace(model.Email) ||
                string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest("Username, Email and Password are required.");
            }

            // Validate email format
            if (!Regex.IsMatch(model.Email.Trim(), @"^\S+@\S+\.\S+$", RegexOptions.Compiled))
            {
                return BadRequest("Invalid email address.");
            }

            // Disallow creating Application Admin via this endpoint
            if (!string.IsNullOrWhiteSpace(model.Role) && model.Role.Trim().Equals("Application Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Cannot create Application Admin users through this endpoint.");
            }

            // Validate password policy
            if (model.Password.Length < 8 ||
                !Regex.IsMatch(model.Password, @"[A-Z]") ||
                !Regex.IsMatch(model.Password, @"[a-z]") ||
                !Regex.IsMatch(model.Password, @"[0-9]"))
            {
                return BadRequest("Password must be at least 8 characters and include upper, lower and number.");
            }

            // Validate role and store dependency
            var roleName = model.Role?.Trim();
            var roleRequiresStore = roleName == "Store Manager" || roleName == "Store Employee";
            if (roleRequiresStore && !model.StoreId.HasValue)
            {
                return BadRequest("Store selection is required for the selected role.");
            }

            // Validate organization
            if (!model.OrgId.HasValue)
            {
                return BadRequest("Organization is required.");
            }

            // Prevent duplicate identity user by email
            var existingIdentity = await _userManager.FindByEmailAsync(model.Email.Trim());
            if (existingIdentity != null)
            {
                return Conflict("A user with the same email already exists.");
            }

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Create identity user
            var appUser = new ApplicationUser
            {
                UserName = model.Username.Trim(),
                Email = model.Email.Trim(),
                PhoneNumber = model.Phone
            };

            var result = await _userManager.CreateAsync(appUser, model.Password);
            if (!result.Succeeded)
            {
                _logger.LogWarning("CreateAsync failed for user {UserName}: {Errors}", model.Username, result.Errors);
                return BadRequest(result.Errors);
            }

            try
            {
                if (!string.IsNullOrWhiteSpace(roleName))
                {
                    await _userManager.AddToRoleAsync(appUser, roleName);
                }

                var roles = await _roleRepository.GetAllAsync();
                Role roleEntity = null;
                if (!string.IsNullOrWhiteSpace(roleName))
                {
                    roleEntity = roles.FirstOrDefault(r => string.Equals(r.RoleTitle, roleName, StringComparison.OrdinalIgnoreCase));
                    if (roleEntity == null)
                    {
                        return BadRequest("Selected role does not exist in domain roles table.");
                    }
                }
                else
                {
                    roleEntity = roles.FirstOrDefault(r => r.RoleTitle == "Store Employee");
                    if (roleEntity == null)
                    {
                        return BadRequest("No role supplied and default domain role 'Store Employee' not found.");
                    }
                }

                var domainUser = new User
                {
                    UserFirstname = model.FirstName,
                    UserLastname = string.IsNullOrWhiteSpace(model.LastName) ? model.Username : model.LastName,
                    Email = model.Email,
                    Phone = model.Phone,
                    IsActive = model.IsActive,
                    OrgId = model.OrgId,
                    StoreId = roleRequiresStore ? model.StoreId : null,
                    RoleId = roleEntity.RoleId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var created = await _userRepository.AddAsync(domainUser);
                var createdDto = await _userRepository.GetDetailByIdAsync(created.UserId);
                return CreatedAtAction(nameof(GetById), new { id = created.UserId }, createdDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create domain user after identity creation. Rolling back identity user.");
                var createdIdentity = await _userManager.FindByEmailAsync(model.Email.Trim());
                if (createdIdentity != null)
                {
                    await _userManager.DeleteAsync(createdIdentity);
                }
                return StatusCode(500, "Failed to create user.");
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
