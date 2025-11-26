using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("supplier")]
public partial class Supplier
{
    [Key]
    [Column("supplier_id")]
    public int SupplierId { get; set; }

    [Column("supplier_name")]
    [StringLength(150)]
    public string SupplierName { get; set; } = null!;

    [Column("contact_method")]
    [StringLength(350)]
    public string ContactMethod { get; set; } = null!;

    [Column("store_id")]
    public int? StoreId { get; set; }

    [InverseProperty("Supplier")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();

    [ForeignKey("StoreId")]
    [InverseProperty("Suppliers")]
    public virtual Store? Store { get; set; }
}
