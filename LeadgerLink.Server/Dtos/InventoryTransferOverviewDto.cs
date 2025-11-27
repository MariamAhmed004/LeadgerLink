namespace LeadgerLink.Server.Dtos
{
    // Lightweight overview used for dashboard tables.
    public class InventoryTransferOverviewDto
    {
        public int TransferId { get; set; }
        public string? Requester { get; set; }
        public string? FromStore { get; set; }
        public string? ToStore { get; set; }
        public string? Status { get; set; }
        public DateTime? RequestedAt { get; set; }
    }
}