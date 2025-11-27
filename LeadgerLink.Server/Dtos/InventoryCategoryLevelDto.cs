namespace LeadgerLink.Server.Dtos
{
    // Summary of inventory by category for reporting.
    public class InventoryCategoryLevelDto
    {
        public int? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalValue { get; set; }
    }
}
