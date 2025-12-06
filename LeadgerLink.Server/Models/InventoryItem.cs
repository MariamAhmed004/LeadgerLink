using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("inventory_item")]
[Index("SupplierId", Name = "IXFK_inventory_item_Supplier")]
[Index("UserId", Name = "IXFK_inventory_item_user_02")]
public partial class InventoryItem
{
    [Key]
    [Column("inventory_item_id")]
    public int InventoryItemId { get; set; }

    [Column("inventory_item_name")]
    [StringLength(100)]
    public string InventoryItemName { get; set; } = null!;

    [Column("store_id")]
    public int StoreId { get; set; }

    [Column("unit_id")]
    public int UnitId { get; set; }

    [Column("quantity", TypeName = "decimal(20, 3)")]
    public decimal Quantity { get; set; }

    [Column("cost_per_unit", TypeName = "decimal(18, 3)")]
    public decimal CostPerUnit { get; set; }

    [Column("minimum_quantity", TypeName = "decimal(18, 3)")]
    public decimal? MinimumQuantity { get; set; }

    [Column("inventory_item_image", TypeName = "varbinary(max)")]
    public byte[]? InventoryItemImage { get; set; }

    [Column("description")]
    [StringLength(850)]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("inventory_item_category_id")]
    public int? InventoryItemCategoryId { get; set; }

    [Column("supplier_id")]
    public int? SupplierId { get; set; }

    [ForeignKey("InventoryItemCategoryId")]
    [InverseProperty("InventoryItems")]
    public virtual InventoryItemCategory? InventoryItemCategory { get; set; }

    [InverseProperty("InventoryItem")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    [InverseProperty("InventoryItem")]
    public virtual ICollection<RecipeInventoryItem> RecipeInventoryItems { get; set; } = new List<RecipeInventoryItem>();

    [ForeignKey("StoreId")]
    [InverseProperty("InventoryItems")]
    public virtual Store Store { get; set; } = null!;

    [ForeignKey("SupplierId")]
    [InverseProperty("InventoryItems")]
    public virtual Supplier? Supplier { get; set; }

    [InverseProperty("InventoryItem")]
    public virtual ICollection<TransferItem> TransferItems { get; set; } = new List<TransferItem>();

    [ForeignKey("UnitId")]
    [InverseProperty("InventoryItems")]
    public virtual Unit Unit { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("InventoryItems")]
    public virtual User? User { get; set; }
}
