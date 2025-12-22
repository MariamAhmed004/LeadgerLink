namespace LeadgerLink.Server.Dtos.AuditLogDtos
{
    // Brief audit log row used for lists and dashboards.
    public class AuditLogOverviewDto
    {
        public int AuditLogId { get; set; }
        public DateTime Timestamp { get; set; }
        public int? UserId { get; set; }
        public string? UserName { get; set; }
        public string? ActionType { get; set; }
        public string? Details { get; set; }
    }
}
