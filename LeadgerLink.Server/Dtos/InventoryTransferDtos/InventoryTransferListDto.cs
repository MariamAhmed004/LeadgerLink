namespace LeadgerLink.Server.Dtos.InventoryTransferDtos
{
    // DTO for listing inventory transfers with computed fields for the UI.
    public class InventoryTransferListDto
    {
        public int TransferId { get; set; }
        public string? InOut { get; set; }              // "In", "Out" or "N/A"
        public string? StoreInvolved { get; set; }      // the other store name
        public string? Status { get; set; }
        public DateTime? RequestedAt { get; set; }
        public string? DriverName { get; set; }         // "Not assigned" if null
        public string? Requester { get; set; }
    }
}