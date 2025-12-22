namespace LeadgerLink.Server.Dtos.RecipeDtos
{
    public class UpdateRecipeDto
    {
        public int RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public string? Instructions { get; set; }
        public RecipeIngredientDto[]? Ingredients { get; set; }
        public bool IsOnSale { get; set; }
        public int? VatCategoryId { get; set; }
        public string? ProductDescription { get; set; }
        public decimal? SellingPrice { get; set; }
        public decimal? CostPrice { get; set; }
    }
}
