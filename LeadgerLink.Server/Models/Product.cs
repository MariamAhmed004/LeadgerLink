using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("product")]
public partial class Product
{
    [Key]
    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("product_name")]
    [StringLength(50)]
    public string ProductName { get; set; } = null!;

    [Column("sellingPrice", TypeName = "decimal(18, 3)")]
    public decimal? SellingPrice { get; set; }

    [Column("costPrice", TypeName = "decimal(18, 3)")]
    public decimal? CostPrice { get; set; }

    [Column("store_id")]
    public int? StoreId { get; set; }

    [Column("is_recipe")]
    public bool IsRecipe { get; set; }

    [Column("recipe_id")]
    public int? RecipeId { get; set; }

    [Column("inventory_item_id")]
    public int? InventoryItemId { get; set; }

    [Column("VAT_category_id")]
    public int VatCategoryId { get; set; }

    [Column("description")]
    [StringLength(900)]
    public string? Description { get; set; }

    [ForeignKey("InventoryItemId")]
    [InverseProperty("Products")]
    public virtual InventoryItem? InventoryItem { get; set; }

    [ForeignKey("RecipeId")]
    [InverseProperty("Products")]
    public virtual Recipe? Recipe { get; set; }

    [InverseProperty("Product")]
    public virtual ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();

    [ForeignKey("StoreId")]
    [InverseProperty("Products")]
    public virtual Store? Store { get; set; }

    [ForeignKey("VatCategoryId")]
    [InverseProperty("Products")]
    public virtual VatCategory VatCategory { get; set; } = null!;
}
