using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("sale")]
public partial class Sale
{
    [Key]
    [Column("sale_id")]
    public int SaleId { get; set; }

    [Column("timestamp")]
    public DateTime Timestamp { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("store_id")]
    public int StoreId { get; set; }

    [Column("total_amount", TypeName = "decimal(18, 3)")]
    public decimal TotalAmount { get; set; }

    [Column("applied_discount", TypeName = "decimal(18, 3)")]
    public decimal AppliedDiscount { get; set; }

    [Column("payment_method_id")]
    public int? PaymentMethodId { get; set; }

    [Column("notes")]
    [StringLength(1500)]
    public string? Notes { get; set; }

    [Column("created_at")]
    [StringLength(50)]
    public string CreatedAt { get; set; } = null!;

    [Column("updated_at")]
    [StringLength(50)]
    public string UpdatedAt { get; set; } = null!;

    [ForeignKey("PaymentMethodId")]
    [InverseProperty("Sales")]
    public virtual PaymentMethod? PaymentMethod { get; set; }

    [InverseProperty("Sale")]
    public virtual ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();

    [ForeignKey("StoreId")]
    [InverseProperty("Sales")]
    public virtual Store Store { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("Sales")]
    public virtual User User { get; set; } = null!;
}
