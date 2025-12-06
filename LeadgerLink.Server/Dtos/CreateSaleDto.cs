using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos
{
    public class CreateSaleItemDto
    {
        public int ProductId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class CreateSaleDto
    {
        public DateTime Timestamp { get; set; }
        public int? UserId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AppliedDiscount { get; set; }
        public int? PaymentMethodId { get; set; }
        public string? Notes { get; set; }
        public List<CreateSaleItemDto>? Items { get; set; }
    }
}