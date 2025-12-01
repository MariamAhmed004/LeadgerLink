using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos
{
    // Detailed DTO for an inventory item returned to the client.
    public class InventoryItemDetailDto
    {
        public int InventoryItemId { get; set; }
        public string? InventoryItemName { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public decimal? MinimumQuantity { get; set; }
        public decimal CostPerUnit { get; set; }
        public string? UnitName { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public int StoreId { get; set; }
        public string? StoreName { get; set; }
        public string StockLevel { get; set; } = "";
        public string? ImageDataUrl { get; set; } // data:image/*;base64,...
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Optional related counts
        public int RelatedProductsCount { get; set; }
    }
}