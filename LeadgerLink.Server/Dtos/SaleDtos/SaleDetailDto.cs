using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos.SaleDtos
{
    public class SaleItemDetailDto
    {
        public int ProductId { get; set; }
        public decimal Quantity { get; set; }
        public string? ProductName { get; set; }
    }

    public class SaleDetailDto
    {
        public int SaleId { get; set; }
        public DateTime Timestamp { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AppliedDiscount { get; set; }
        public int? PaymentMethodId { get; set; }
        public string? PaymentMethodName { get; set; }
        public string? Notes { get; set; }
        public int CreatedById { get; set; }
        public string? CreatedByName { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
        public List<SaleItemDetailDto> SaleItems { get; set; } = new();
        public int? StoreId { get; set; }
    }
}
