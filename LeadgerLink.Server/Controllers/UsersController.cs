using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IUserRepository _userRepository;
        private readonly IRepository<Role> _roleRepository;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            IUserRepository userRepository,
            IRepository<Role> roleRepository,
            ILogger<UsersController> logger)
        {
            _userManager = userManager;
            _userRepository = userRepository;
            _roleRepository = roleRepository ?? throw new ArgumentNullException(nameof(roleRepository));
            _logger = logger;
        }

        // GET: api/users
        // Return a lightweight projection (reuses UserDetailDto) for the list endpoint.
        // Optional query: orgId, storeId
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDetailDto>>> GetAll([FromQuery] int? orgId = null, [FromQuery] int? storeId = null)
        {
            var list = await _userRepository.GetListAsync();

            if (orgId.HasValue)
                list = list.Where(u => (u.OrgId ?? 0) == orgId.Value).ToList();

            if (storeId.HasValue)
                list = list.Where(u => (u.StoreId ?? 0) == storeId.Value).ToList();

            return Ok(list);
        }

        // GET: api/users/{id}
        // Return DTO projection to ensure view has only required scalars (avoids cycles)
        [HttpGet("{id:int}")]
        public async Task<ActionResult<UserDetailDto>> GetById(int id)
        {
            var dto = await _userRepository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        // GET: api/users/count
        // Optional query parameter: orgId
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int? orgId)
        {
            if (orgId.HasValue)
            {
                var c = await _userRepository.CountAsync(u => u.OrgId == orgId.Value);
                return Ok(c);
            }

            var total = await _userRepository.CountAsync(u => true);
            return Ok(total);
        }

        // POST: api/users
        // Creates both an Identity user and a domain User record.
        [HttpPost]
        public async Task<IActionResult> AddUser([FromBody] AddUserDto model)
        {
            if (model == null) return BadRequest("Request body is required.");

            // Basic required fields
            if (string.IsNullOrWhiteSpace(model.Username) ||
                string.IsNullOrWhiteSpace(model.Email) ||
                string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest("Username, Email and Password are required.");
            }

            // Email format
            if (!Regex.IsMatch(model.Email.Trim(), @"^\S+@\S+\.\S+$", RegexOptions.Compiled))
            {
                return BadRequest("Invalid email address.");
            }

            // Disallow creating Application Admin via this endpoint
            if (!string.IsNullOrWhiteSpace(model.Role) && model.Role.Trim().Equals("Application Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Cannot create Application Admin users through this endpoint.");
            }

            // Password basic policy (server-side). Adjust to match identity password policy if needed.
            if (model.Password.Length < 8 ||
                !Regex.IsMatch(model.Password, @"[A-Z]") ||
                !Regex.IsMatch(model.Password, @"[a-z]") ||
                !Regex.IsMatch(model.Password, @"[0-9]"))
            {
                return BadRequest("Password must be at least 8 characters and include upper, lower and number.");
            }

            // Role -> store dependency: if role is store-level require StoreId
            var roleName = model.Role?.Trim();
            var roleRequiresStore = roleName == "Store Manager" || roleName == "Store Employee";
            if (roleRequiresStore && !model.StoreId.HasValue)
            {
                return BadRequest("Store selection is required for the selected role.");
            }

            // Require organization (client-side already does this; enforce here)
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
                    // Add role to Identity user (assume roles seeded in AspNetRoles)
                    await _userManager.AddToRoleAsync(appUser, roleName);
                }

                // Resolve domain Role FK: find role entity by title
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
                    // if no role supplied, pick a sensible default (Store Employee) if exists
                    roleEntity = roles.FirstOrDefault(r => r.RoleTitle == "Store Employee");
                    if (roleEntity == null)
                    {
                        return BadRequest("No role supplied and default domain role 'Store Employee' not found.");
                    }
                }

                // create domain user record with RoleId set to avoid FK conflict
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

                // return DTO for created resource (consistent with GetById)
                var createdDto = await _userRepository.GetDetailByIdAsync(created.UserId);
                return CreatedAtAction(nameof(GetById), new { id = created.UserId }, createdDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create domain user after identity creation. Rolling back identity user.");
                // Attempt to clean up the created identity user to avoid orphaned identity record
                var createdIdentity = await _userManager.FindByEmailAsync(model.Email.Trim());
                if (createdIdentity != null)
                {
                    await _userManager.DeleteAsync(createdIdentity);
                }
                return StatusCode(500, "Failed to create user.");
            }
        }
    }
}
