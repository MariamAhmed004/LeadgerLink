namespace LeadgerLink.Server.Dtos.RecipeDtos
{
    // Best selling recipe summary for a store.
    public class BestSellingRecipeDto
    {
        public int RecipeId { get; set; }
        public string? RecipeName { get; set; }
        public decimal TotalQuantity { get; set; }
    }
}