using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

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
