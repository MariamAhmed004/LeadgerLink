using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("inventory_item_categories")]
public partial class InventoryItemCategory
{
    [Key]
    [Column("inventory_item_category_id")]
    public int InventoryItemCategoryId { get; set; }

    [Column("inventory_item_category")]
    [StringLength(150)]
    public string InventoryItemCategory1 { get; set; } = null!;

    [InverseProperty("InventoryItemCategory")]
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
