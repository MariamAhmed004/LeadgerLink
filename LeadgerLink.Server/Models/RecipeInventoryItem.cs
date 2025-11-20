using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("recipe_inventory_item")]
public partial class RecipeInventoryItem
{
    [Key]
    [Column("recipe_inventory_item_id")]
    public int RecipeInventoryItemId { get; set; }

    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Column("inventory_item_id")]
    public int InventoryItemId { get; set; }

    [Column("quantity", TypeName = "decimal(18, 3)")]
    public decimal Quantity { get; set; }

    [ForeignKey("InventoryItemId")]
    [InverseProperty("RecipeInventoryItems")]
    public virtual InventoryItem InventoryItem { get; set; } = null!;

    [ForeignKey("RecipeId")]
    [InverseProperty("RecipeInventoryItems")]
    public virtual Recipe Recipe { get; set; } = null!;
}
