using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos.InventoryTransferDtos
{
    public class InventoryTransferDetailDto
    {
        public int TransferId { get; set; }
        public string? FromStoreName { get; set; }
        public string? ToStoreName { get; set; }
        public DateOnly? TransferDate { get; set; }
        public string? Status { get; set; }
        public DateTime? RequestedAt { get; set; }
        public DateTime? RecievedAt { get; set; }
        public string? Notes { get; set; }
        public string? RequestedByName { get; set; }
        public string? ApprovedByName { get; set; }
        public string? DriverName { get; set; }
        public string? DriverEmail { get; set; }
        public IEnumerable<InventoryTransferItemDto> Items { get; set; } = new List<InventoryTransferItemDto>();
    }

    public class InventoryTransferItemDto
    {
        public int TransferItemId { get; set; }
        public int? InventoryItemId { get; set; }
        public string? InventoryItemName { get; set; }
        public decimal? Quantity { get; set; }
        public bool? IsRequested { get; set; }
        public int? RecipeId { get; set; }
        public string? RecipeName { get; set; }
    }
}
