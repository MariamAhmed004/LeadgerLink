using System.Security.Claims;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Identity;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {

        // ASP.NET Identity SignInManager for handling sign-in operations
        private readonly SignInManager<ApplicationUser> _signInManager;

        // ASP.NET Identity UserManager for managing user accounts
        private readonly UserManager<ApplicationUser> _userManager;

        // Audit logger for logging authentication actions
        private readonly IAuditLogger _auditLogger;

        // User repository for fetching user data
        private readonly IUserRepository _userRepository;

        // Constructor to initialize dependencies
        public AuthController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, IAuditLogger auditLogger, IUserRepository userRepository)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _auditLogger = auditLogger;
            _userRepository = userRepository;
        }

        // POST api/auth/login
        // Authenticates a user and logs them in.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // ------------------------- Validate user credentials -------------------------
            var user = await _userManager.FindByNameAsync(model.Username);
            if (user == null) return Unauthorized("Invalid username or password");

            // Use isPersistent to control whether the cookie is persistent
            var result = await _signInManager.PasswordSignInAsync(user, model.Password, isPersistent: true, lockoutOnFailure: false);
            if (!result.Succeeded) return Unauthorized("Invalid username or password");

            // ------------------------- Log login action -------------------------
            await _auditLogger.LogLoginAsync($"User {user.UserName} logged in.");

            // ------------------------- Return result -------------------------
            return Ok("Logged in");
        }

        // GET api/auth/loggedInuser
        // Retrieves the currently logged-in user's details.
        [HttpGet("loggedInuser")]
        public async Task<IActionResult> LoggedInUser()
        {
            // ------------------------- Check authentication status -------------------------
            if (User?.Identity?.IsAuthenticated != true)
            {
                return Ok(new LoggedInUserDto
                {
                    IsAuthenticated = false
                });
            }

            // ------------------------- Fetch user details -------------------------
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                     ?? User.Identity!.Name;

            var roles = User.Claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
                .Select(c => c.Value)
                .ToArray();

            var userRecord = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            // ------------------------- Return result -------------------------
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

        // POST api/auth/logout
        // Logs out the currently authenticated user.
        [HttpPost("Logout")]
        public async Task<IActionResult> Logout()
        {
            // ------------------------- Log logout action -------------------------
            await _auditLogger.LogLogoutAsync($"User {User.Identity?.Name} logged out.");

            // ------------------------- Perform logout -------------------------
            await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);

            // ------------------------- Return result -------------------------
            return Ok();
        }
    }
}
