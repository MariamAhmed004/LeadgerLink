using System.Threading.Tasks;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/email")] 
    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;
        public EmailController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        // POST api/email/test
        // Body: { "to": "recipient@example.com", "subject": "Test", "htmlBody": "<p>Hello</p>" }
        [HttpPost("test")]
        public async Task<ActionResult> SendTest([FromBody] TestEmailDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.To)) return BadRequest("Provide 'to' email.");
            var subject = string.IsNullOrWhiteSpace(dto.Subject) ? "LedgerLink Test Email" : dto.Subject;
            var body = string.IsNullOrWhiteSpace(dto.HtmlBody) ? "<p>This is a test email from LedgerLink.</p>" : dto.HtmlBody;

            await _emailService.SendAsync(dto.To, subject, body);
            return Ok(new { sent = true, to = dto.To });
        }

        public class TestEmailDto
        {
            public string To { get; set; } = string.Empty;
            public string? Subject { get; set; }
            public string? HtmlBody { get; set; }
        }
    }
}
