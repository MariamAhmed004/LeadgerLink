using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos
{
    // Shared DTO for creating and updating recipes.
    public class RecipeSaveDto
    {
        // For create this can be null. For update it should match route id.
        public int? RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public string? Instructions { get; set; }
        public RecipeIngredientDto[]? Ingredients { get; set; }
        public bool IsOnSale { get; set; }
        public int? VatCategoryId { get; set; }
        public string? ProductDescription { get; set; }
        // Optional product pricing fields (used when creating product programmatically)
        public decimal? SellingPrice { get; set; }
        public decimal? CostPrice { get; set; }
    }
}
