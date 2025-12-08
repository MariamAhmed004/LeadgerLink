using System;

namespace LeadgerLink.Server.Dtos
{
    // Lightweight DTO for recipe list pages.
    public class RecipeListDto
    {
        public int RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public int? CreatedById { get; set; }
        public string? CreatedByName { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // True when there is an associated Product entry using this recipe (meaning the recipe is "on sale").
        public bool InSale { get; set; }
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public decimal? SellingPrice { get; set; }
        // New: number of full recipes that can be made from available inventory
        public int Available { get; set; }
        public int? RelatedProductId { get; set; }
    }
}