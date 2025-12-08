namespace LeadgerLink.Server.Dtos
{
    // Lightweight DTO used by the frontend listing for inventory items.
    public class InventoryItemListDto
    {
        public int InventoryItemId { get; set; }
        public string? InventoryItemName { get; set; }
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? UnitName { get; set; }
        public decimal Quantity { get; set; }
        public decimal? MinimumQuantity { get; set; }
        public string StockLevel { get; set; } = "";
        public DateTime UpdatedAt { get; set; }
        public string? Description { get; set; }
        public decimal? CostPerUnit { get; set; }
        public string? ImageUrl { get; set; }
    }
}