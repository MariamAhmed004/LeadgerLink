using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("store")]
public partial class Store
{
    [Key]
    [Column("store_id")]
    public int StoreId { get; set; }

    [Column("store_name")]
    [StringLength(200)]
    public string StoreName { get; set; } = null!;

    [Column("location")]
    public string? Location { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("org_id")]
    public int OrgId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("email")]
    [StringLength(200)]
    public string? Email { get; set; }

    [Column("phone_number")]
    [StringLength(50)]
    public string? PhoneNumber { get; set; }

    [Column("opening_date")]
    public DateTime? OpeningDate { get; set; }

    [Column("operational_status_id")]
    public int OperationalStatusId { get; set; }

    [Column("working_hours")]
    [StringLength(150)]
    public string? WorkingHours { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [InverseProperty("Store")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();

    [InverseProperty("FromStoreNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferFromStoreNavigations { get; set; } = new List<InventoryTransfer>();

    [InverseProperty("ToStoreNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferToStoreNavigations { get; set; } = new List<InventoryTransfer>();

    [ForeignKey("OperationalStatusId")]
    [InverseProperty("Stores")]
    public virtual OperationalStatus OperationalStatus { get; set; } = null!;

    [ForeignKey("OrgId")]
    [InverseProperty("Stores")]
    public virtual Organization Org { get; set; } = null!;

    [InverseProperty("Store")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    [InverseProperty("Store")]
    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();

    [InverseProperty("Store")]
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();

    [ForeignKey("UserId")]
    [InverseProperty("Stores")]
    public virtual User? User { get; set; }
}
