using System;

namespace LeadgerLink.Server.Dtos
{
    // Lightweight list DTO for products shown in store listings.
    public class ProductListDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal? SellingPrice { get; set; }

        // NEW: description from Product.Description
        public string? Description { get; set; }

        // Source flags
        public int? InventoryItemId { get; set; }
        public int? RecipeId { get; set; }
        public string Source { get; set; } = "Unknown";

        // Availability
        public bool IsAvailable { get; set; }
        public string? AvailabilityMessage { get; set; }

        // Available quantity for inventory items (client uses this to display stock)
        public decimal? InventoryItemQuantity { get; set; }

        // For recipe-backed products: how many full recipes can be made from current ingredient stocks
        public int? AvailableQuantity { get; set; }
    }
}