using System;
using System.Collections.Generic;
using System.Linq;
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
        // Return a lightweight projection (reuses UserDetailDto) for the list endpoint.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDetailDto>>> GetAll()
        {
            var list = await _userRepository.GetListAsync();
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
            };

            var created = await _userRepository.AddAsync(domainUser);

            // return DTO for created resource (consistent with GetById)
            var createdDto = await _userRepository.GetDetailByIdAsync(created.UserId);
            return CreatedAtAction(nameof(GetById), new { id = created.UserId }, createdDto);
        }
    }
}
