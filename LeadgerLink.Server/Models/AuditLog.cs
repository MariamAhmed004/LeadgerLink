using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("audit_log")]
[Index("ActionTypeId", Name = "IXFK_audit_log_action_type")]
[Index("AuditLogLevelId", Name = "IXFK_audit_log_audit_log_level")]
[Index("UserId", Name = "IXFK_audit_log_user")]
public partial class AuditLog
{
    [Key]
    [Column("audit_log_id")]
    public int AuditLogId { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; }

    [Column("old_value")]
    [StringLength(700)]
    public string? OldValue { get; set; }

    [Column("new_value")]
    [StringLength(700)]
    public string? NewValue { get; set; }

    [Column("details")]
    public string? Details { get; set; }

    [Column("action_type_id")]
    public int? ActionTypeId { get; set; }

    [Column("audit_log_level_id")]
    public int? AuditLogLevelId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [ForeignKey("ActionTypeId")]
    [InverseProperty("AuditLogs")]
    public virtual ActionType? ActionType { get; set; }

    [ForeignKey("AuditLogLevelId")]
    [InverseProperty("AuditLogs")]
    public virtual AuditLogLevel? AuditLogLevel { get; set; }

    [ForeignKey("UserId")]
    [InverseProperty("AuditLogs")]
    public virtual User? User { get; set; }
}
