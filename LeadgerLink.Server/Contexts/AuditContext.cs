namespace LeadgerLink.Server.Contexts;

public interface IAuditContext
{
    int? AuditLevel { get; set; }
    bool IsAuditEnabled { get; set; }
    int? UserId { get; set; } // Add UserId property
}

public class AuditContext : IAuditContext
{
    public int? AuditLevel { get; set; }
    public bool IsAuditEnabled { get; set; } = true;
    public int? UserId { get; set; } // Implement UserId property
}