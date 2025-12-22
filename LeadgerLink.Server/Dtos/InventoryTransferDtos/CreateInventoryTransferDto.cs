using System;

namespace LeadgerLink.Server.Dtos.InventoryTransferDtos
{
    public class CreateInventoryTransferItemDto
    {
        public int? RecipeId { get; set; }
        public int? InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class CreateInventoryTransferDto
    {
        public int? RequesterStoreId { get; set; }
        public int? FromStoreId { get; set; }
        public string? Date { get; set; }
        public string? Status { get; set; } // Draft | Pending
        public string? Notes { get; set; }
        public CreateInventoryTransferItemDto[] Items { get; set; } = Array.Empty<CreateInventoryTransferItemDto>();
    }
}