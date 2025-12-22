using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos.RecipeDtos
{
    public class RecipeDetailDto
    {
        public int RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public string? Description { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? Image { get; set; }
        public bool IsOnSale { get; set; }
        public int? RelatedProductId { get; set; }
        public IEnumerable<RecipeIngredientDto> Ingredients { get; set; } = new List<RecipeIngredientDto>();
    }

    public class RecipeIngredientDto
    {
        public int RecipeInventoryItemId { get; set; }
        public int? InventoryItemId { get; set; }
        public string? InventoryItemName { get; set; }
        public decimal? Quantity { get; set; }
    }
}
