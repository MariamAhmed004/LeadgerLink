using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("user")]
public partial class User
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("user_firstname")]
    [StringLength(50)]
    public string? UserFirstname { get; set; }

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("store_id")]
    public int? StoreId { get; set; }

    [Column("email")]
    [StringLength(350)]
    public string? Email { get; set; }

    [Column("phone")]
    [StringLength(25)]
    public string? Phone { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("org_id")]
    public int OrgId { get; set; }

    [Column("user_lastname")]
    [StringLength(50)]
    public string UserLastname { get; set; } = null!;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_ at")]
    public DateTime UpdatedAt { get; set; }

    [InverseProperty("User")]
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    [InverseProperty("User")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();

    [InverseProperty("ApprovedByNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferApprovedByNavigations { get; set; } = new List<InventoryTransfer>();

    [InverseProperty("RequestedByNavigation")]
    public virtual ICollection<InventoryTransfer> InventoryTransferRequestedByNavigations { get; set; } = new List<InventoryTransfer>();

    [InverseProperty("User")]
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    [InverseProperty("CreatedByNavigation")]
    public virtual ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();

    [ForeignKey("RoleId")]
    [InverseProperty("Users")]
    public virtual Role Role { get; set; } = null!;

    [InverseProperty("User")]
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();

    [InverseProperty("User")]
    public virtual ICollection<Store> Stores { get; set; } = new List<Store>();
}
