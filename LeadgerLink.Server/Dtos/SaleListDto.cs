namespace LeadgerLink.Server.Dtos
{
    // DTO for returning simple sale list items to the UI.
    public class SaleListDto
    {
        public int Id { get; set; }
        public System.DateTime Timestamp { get; set; }
        public int CreatedById { get; set; }
        public string? CreatedByName { get; set; }
        public decimal Amount { get; set; }
        public int? PaymentMethodId { get; set; }
        public string? PaymentMethodName { get; set; }
        // Optional: add other properties needed by the frontend later
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
    }
}