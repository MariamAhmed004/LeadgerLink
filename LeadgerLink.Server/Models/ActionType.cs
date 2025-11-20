using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("action_types")]
public partial class ActionType
{
    [Key]
    [Column("action_type_id")]
    [StringLength(50)]
    public string ActionTypeId { get; set; } = null!;

    [Column("action_type")]
    [StringLength(50)]
    public string ActionType1 { get; set; } = null!;

    [InverseProperty("ActionType")]
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
