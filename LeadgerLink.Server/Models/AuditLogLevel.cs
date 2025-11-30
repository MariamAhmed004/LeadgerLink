using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("audit_log_levels")]
public partial class AuditLogLevel
{
    [Key]
    [Column("audit_log_level_id")]
    [StringLength(50)]
    public string AuditLogLevelId { get; set; } = null!;

    [Column("audit_log_level_name")]
    [StringLength(150)]
    public string AuditLogLevelName { get; set; } = null!;

    [InverseProperty("AuditLogLevel")]
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
