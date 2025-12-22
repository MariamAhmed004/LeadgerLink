namespace LeadgerLink.Server.Dtos.InventoryTransferDtos
{
    // Monthly inventory movement summary for a quarter.
    public class MonthlyInventoryMovementDto
    {
        // Month number (1..12)
        public int Month { get; set; }

        // Total quantity moved in that month
        public decimal TotalQuantity { get; set; }
    }
}
