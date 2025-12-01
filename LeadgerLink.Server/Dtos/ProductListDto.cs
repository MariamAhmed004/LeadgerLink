namespace LeadgerLink.Server.Dtos
{
    // Lightweight DTO for product listing with availability info.
    public class ProductListDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal? SellingPrice { get; set; }

        // Source: "InventoryItem" or "Recipe"
        public string? Source { get; set; }

        // True when product can be sold (inventory available or recipe ingredients available)
        public bool IsAvailable { get; set; }

        // Optional human-friendly note (e.g., missing ingredient name)
        public string? AvailabilityMessage { get; set; }

        public int? InventoryItemId { get; set; }
        public int? RecipeId { get; set; }
    }
}