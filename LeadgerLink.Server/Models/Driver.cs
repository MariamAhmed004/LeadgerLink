using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("driver")]
public partial class Driver
{
    [Key]
    [Column("driver_id")]
    public int DriverId { get; set; }

    [Column("driver_name")]
    [StringLength(150)]
    public string DriverName { get; set; } = null!;

    [Column("driver_email")]
    [StringLength(250)]
    public string DriverEmail { get; set; } = null!;

    [Column("store_id")]
    public int? StoreId { get; set; }

    [InverseProperty("Driver")]
    public virtual ICollection<InventoryTransfer> InventoryTransfers { get; set; } = new List<InventoryTransfer>();

    [ForeignKey("StoreId")]
    [InverseProperty("Drivers")]
    public virtual Store? Store { get; set; }
}
