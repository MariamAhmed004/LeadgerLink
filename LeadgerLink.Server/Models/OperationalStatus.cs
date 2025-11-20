using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("operational_statuses")]
public partial class OperationalStatus
{
    [Key]
    [Column("operational_status_id")]
    public int OperationalStatusId { get; set; }

    [Column("operational_status")]
    [StringLength(50)]
    public string OperationalStatus1 { get; set; } = null!;

    [InverseProperty("OperationalStatus")]
    public virtual ICollection<Store> Stores { get; set; } = new List<Store>();
}
