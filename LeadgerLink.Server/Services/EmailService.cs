using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

// EmailService usage & setup (for future reference):
// - Packages: install MailKit + MimeKit in LeadgerLink.Server.
// - Configuration: add Smtp section in appsettings.json and bind via Program.cs.
//   Example:
//   {
//     "Smtp": {
//       "Host": "smtp.gmail.com",
//       "Port": 587,           // 587 STARTTLS or 465 SSL
//       "UseSsl": false,       // false for STARTTLS (587), true for SSL (465)
//       "FromEmail": "leadgerlink@gmail.com",
//       "FromName": "LedgerLink",
//       "Username": "leadgerlink@gmail.com",
//       "Password": "<Gmail App Password>"
//     }
//   }
// - DI registration in Program.cs:
//   builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
//   builder.Services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<SmtpOptions>>().Value);
//   builder.Services.AddSingleton<IEmailService, EmailService>();
// - Gmail notes: enable 2-Step Verification and create an App Password for SMTP.
// - Usage: inject IEmailService and call:
//   await _email.SendAsync("recipient@example.com", "Subject", "<p>HTML body</p>");
// - Tips:
//   * Prefer environment/user-secrets for credentials in production.
//   * If 587/STARTTLS fails, try 465 with UseSsl=true.
//   * Consider retries/queue for high-volume sending.

namespace LeadgerLink.Server.Services
{
    public interface IEmailService
    {
        Task SendAsync(string toEmail, string subject, string htmlBody);
    }

    public class SmtpOptions
    {
        public string Host { get; set; } = string.Empty; // e.g., smtp.gmail.com
        public int Port { get; set; } = 587;             // 587 STARTTLS or 465 SSL
        public bool UseSsl { get; set; } = true;         // true for SSL (465); false for STARTTLS (587)
        public string FromEmail { get; set; } = string.Empty;
        public string FromName { get; set; } = "LedgerLink";
        public string Username { get; set; } = string.Empty; // Gmail address
        public string Password { get; set; } = string.Empty; // App Password or provider password
    }

    public class EmailService : IEmailService
    {
        private readonly SmtpOptions _options;
        public EmailService(SmtpOptions options) => _options = options;

        public async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            var socketOpt = _options.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(_options.Host, _options.Port, socketOpt);
            if (!string.IsNullOrWhiteSpace(_options.Username))
            {
                await client.AuthenticateAsync(_options.Username, _options.Password);
            }
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}
