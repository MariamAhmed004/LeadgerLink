using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("transfer_item")]
[Index("InventoryItemId", Name = "IXFK_transfer_item_inventory_item")]
[Index("RecipeId", Name = "IXFK_transfer_item_recipe")]
public partial class TransferItem
{
    [Key]
    [Column("transfer_item_id")]
    public int TransferItemId { get; set; }

    [Column("inventory_transfer_id")]
    public int? InventoryTransferId { get; set; }

    [Column("quantity", TypeName = "decimal(18, 3)")]
    public decimal? Quantity { get; set; }

    [Column("is_requested")]
    public bool? IsRequested { get; set; }

    [Column("recipe_id")]
    public int? RecipeId { get; set; }

    [Column("inventory_item_id")]
    public int? InventoryItemId { get; set; }

    [ForeignKey("InventoryItemId")]
    [InverseProperty("TransferItems")]
    public virtual InventoryItem? InventoryItem { get; set; }

    [ForeignKey("InventoryTransferId")]
    [InverseProperty("TransferItems")]
    public virtual InventoryTransfer? InventoryTransfer { get; set; }

    [ForeignKey("RecipeId")]
    [InverseProperty("TransferItems")]
    public virtual Recipe? Recipe { get; set; }
}
