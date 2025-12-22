namespace LeadgerLink.Server.Dtos.InventoryItemDtos
{
    // Ingredient utilization summary for display/analytics.
    public class IngredientUtilizationDto
    {
        public int InventoryItemId { get; set; }
        public string? InventoryItemName { get; set; }
        public decimal Quantity { get; set; }
        public decimal Percentage { get; set; }
    }
}
