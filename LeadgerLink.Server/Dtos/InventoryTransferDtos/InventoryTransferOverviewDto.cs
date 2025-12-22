namespace LeadgerLink.Server.Dtos.InventoryTransferDtos
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

    public class ApproveTransferDto
    {
        public int? DriverId { get; set; }
        public string? NewDriverName { get; set; }
        public string? NewDriverEmail { get; set; }
        public CreateInventoryTransferItemDto[]? Items { get; set; } = Array.Empty<CreateInventoryTransferItemDto>();
        // Notes will override existing transfer notes when provided (per latest requirement)
        public string? Notes { get; set; }
    }

    public class RejectTransferDto
    {
        // Optional notes to override existing notes
        public string? Notes { get; set; }
    }

}