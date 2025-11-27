namespace LeadgerLink.Server.Dtos
{
    // Detailed audit log DTO for viewing a single log entry.
    public class AuditLogDto
    {
        public int AuditLogId { get; set; }
        public DateTime Timestamp { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string? ActionType { get; set; }
        public string? AuditLogLevel { get; set; }
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public string? Details { get; set; }
    }
}