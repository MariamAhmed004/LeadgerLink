using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("unit")]
public partial class Unit
{
    [Key]
    [Column("unit_id")]
    public int UnitId { get; set; }

    [Column("unit_name")]
    [StringLength(100)]
    public string UnitName { get; set; } = null!;

    [InverseProperty("Unit")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
