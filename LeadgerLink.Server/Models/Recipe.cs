using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("recipe")]
[Index("StoreId", Name = "IXFK_recipe_store")]
public partial class Recipe
{
    [Key]
    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Column("recipe_name")]
    [StringLength(300)]
    public string RecipeName { get; set; } = null!;

    [Column("created_by")]
    public int CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Column("instructions")]
    [StringLength(1500)]
    public string? Instructions { get; set; }

    [Column("image", TypeName = "image")]
    public byte[]? Image { get; set; }

    [Column("store_id")]
    public int? StoreId { get; set; }

    [ForeignKey("CreatedBy")]
    [InverseProperty("Recipes")]
    public virtual User CreatedByNavigation { get; set; } = null!;

    [InverseProperty("Recipe")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    [InverseProperty("Recipe")]
    public virtual ICollection<RecipeInventoryItem> RecipeInventoryItems { get; set; } = new List<RecipeInventoryItem>();

    [ForeignKey("StoreId")]
    [InverseProperty("Recipes")]
    public virtual Store? Store { get; set; }

    [InverseProperty("Recipe")]
    public virtual ICollection<TransferItem> TransferItems { get; set; } = new List<TransferItem>();
}
