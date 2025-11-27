using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
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
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            IUserRepository userRepository,
            ILogger<UsersController> logger)
        {
            _userManager = userManager;
            _userRepository = userRepository;
            _logger = logger;
        }

        // GET: api/users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetAll()
        {
            var users = await _userRepository.GetAllAsync();
            return Ok(users);
        }

        // GET: api/users/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<User>> GetById(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        // GET: api/users/count
        // Optional query parameters: orgId, storeId
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int? orgId, [FromQuery] int? storeId)
        {
            if (orgId.HasValue)
            {
                var c = await _userRepository.CountAsync(u => u.OrgId == orgId.Value);
                return Ok(c);
            }

            if (storeId.HasValue)
            {
                var c = await _userRepository.CountAsync(u => u.StoreId == storeId.Value);
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
            if (model == null) return BadRequest();

            // create identity user
            var appUser = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                PhoneNumber = model.Phone
            };

            var result = await _userManager.CreateAsync(appUser, model.Password);
            if (!result.Succeeded)
            {
                _logger.LogWarning("CreateAsync failed for user {UserName}: {Errors}", model.Username, result.Errors);
                return BadRequest(result.Errors);
            }

            if (!string.IsNullOrWhiteSpace(model.Role))
            {
                await _userManager.AddToRoleAsync(appUser, model.Role);
            }

            // create domain user record
            var domainUser = new User
            {
                UserFirstname = model.FirstName,
                UserLastname = string.IsNullOrWhiteSpace(model.LastName) ? model.Username : model.LastName,
                Email = model.Email,
                Phone = model.Phone,
                IsActive = model.IsActive,
                OrgId = model.OrgId,
                StoreId = model.StoreId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
                // RoleId mapping: map role name to RoleId here if you maintain numeric RoleId
            };

            var created = await _userRepository.AddAsync(domainUser);

            return CreatedAtAction(nameof(GetById), new { id = created.UserId }, created);
        }
    }

}
