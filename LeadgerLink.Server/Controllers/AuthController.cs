using System.Security.Claims;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly LedgerLinkDbContext _db;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IAuditLogger _auditLogger;

        public AuthController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, LedgerLinkDbContext db, IAuditLogger auditLogger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _db = db;
            _auditLogger = auditLogger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var user = await _userManager.FindByNameAsync(model.Username);
            if (user == null) return Unauthorized("Invalid username or password");

            var result = await _signInManager.PasswordSignInAsync(user, model.Password, true, false);
            if (!result.Succeeded) return Unauthorized("Invalid username or password");

            // Add audit log for login
            await _auditLogger.LogLoginAsync($"User {user.UserName} logged in.");

            return Ok("Logged in");
        }

        [HttpGet("loggedInuser")]
        public IActionResult LoggedInUser()
        {
            if (User?.Identity?.IsAuthenticated != true)
            {
                return Ok(new LoggedInUserDto
                {
                    IsAuthenticated = false
                });
            }

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                     ?? User.Identity!.Name;

            var roles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
                .Select(c => c.Value)
                .ToArray();

            var userRecord = _db.Users.FirstOrDefault(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            return Ok(new LoggedInUserDto
            {
                IsAuthenticated = true,
                UserName = email,
                Roles = roles,
                FullName = userRecord != null
                    ? $"{userRecord.UserFirstname} {userRecord.UserLastname}"
                    : null,
                UserId = userRecord?.UserId,
                OrgId = userRecord?.OrgId,
                StoreId = userRecord?.StoreId

            });
        }

        [HttpPost("Logout")]
        public async Task<IActionResult> Logout()
        {
            // Add audit log for logout
            await _auditLogger.LogLogoutAsync($"User {User.Identity?.Name} logged out.");

            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
            return Ok();
        }
    }
}
