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

        // Email service for sending emails
        private readonly IEmailService _emailService;

        // Constructor to initialize dependencies
        public AuthController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, IAuditLogger auditLogger, IUserRepository userRepository, IEmailService emailService)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _auditLogger = auditLogger;
            _userRepository = userRepository;
            _emailService = emailService;
        }

        // POST api/auth/login
        // Authenticates a user and logs them in, ensuring the user is active.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // ------------------------- Validate user credentials -------------------------
            var user = await _userManager.FindByNameAsync(model.Username);
            if (user == null) return Unauthorized("Invalid username or password");

            // ------------------------- Check if the user is active -------------------------
            var userRecord = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == user.Email.ToLower());
            if (userRecord == null || !userRecord.IsActive)
            {
                return Unauthorized("Your account is deactivated. Please contact support.");
            }

            // ------------------------- Authenticate user -------------------------
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

        // POST api/auth/request-password-reset
        // Generates a password reset token and sends it to the user's email.
        [HttpPost("request-password-reset")]
        public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetDto model)
        {
            // ------------------------- Validate user existence -------------------------
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return NotFound("User with the specified email does not exist.");

            // ------------------------- Generate password reset token -------------------------
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);

            // ------------------------- Send token via email -------------------------
            var resetLink = $"https://localhost:55070/reset-password?email={Uri.EscapeDataString(model.Email)}&token={Uri.EscapeDataString(token)}";
            var subject = "Password Reset Request";
            var htmlBody = $@"
                <p>Hi {user.UserName},</p>
                <p>You requested to reset your password. Please click the link below to reset your password:</p>
                <p><a href='{resetLink}'>Reset Password</a></p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Thank you,<br>LedgerLink Team</p>";

            await _emailService.SendAsync(model.Email, subject, htmlBody);

            // ------------------------- Log password reset request -------------------------
            await _auditLogger.LogPasswordResetAsync("Password reset requested", model.Email, $"Token generated and email sent to {model.Email}");

            // ------------------------- Return result -------------------------
            return Ok("Password reset email sent.");
        }

        // POST api/auth/reset-password
        // Resets the user's password using the provided token.
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            // ------------------------- Validate user existence -------------------------
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null) return NotFound("User with the specified email does not exist.");

            // ------------------------- Reset password -------------------------
            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (!result.Succeeded)
            {
                // Return validation errors if the reset fails
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            // ------------------------- Log password reset action -------------------------
            await _auditLogger.LogPasswordResetAsync("Password reset completed", model.Email, $"Password successfully reset for {model.Email}");

            // ------------------------- Return result -------------------------
            return Ok("Password reset successfully.");
        }
    }
}
