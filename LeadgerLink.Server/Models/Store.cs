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
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
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
    public virtual ICollection<Driver> Drivers { get; set; } = new List<Driver>();

    [InverseProperty("Store")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();

    [InverseProperty("FromStoreNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferFromStoreNavigations { get; set; } = new List<InventoryTransfer>();

    [InverseProperty("ToStoreNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferToStoreNavigations { get; set; } = new List<InventoryTransfer>();

    [ForeignKey("OperationalStatusId")]
    [InverseProperty("Stores")]
    public virtual OperationalStatus? OperationalStatus { get; set; }

    [ForeignKey("OrgId")]
    [InverseProperty("Stores")]
    public virtual Organization? Org { get; set; }

    [InverseProperty("Store")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    [InverseProperty("Store")]
    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();

    [InverseProperty("Store")]
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();

    [InverseProperty("Store")]
    public virtual ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();

    // existing mapping: store.UserId -> User.Stores (stores this user owns)
    [ForeignKey("UserId")]
    [InverseProperty("Stores")]
    public virtual User? User { get; set; }

    // NEW: inverse collection for users who belong to this store (User.Store -> Store.Users)
    [InverseProperty("Store")]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
