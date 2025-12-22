namespace LeadgerLink.Server.Dtos.ProductDtos
{
    public class UpdateProductDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal SellingPrice { get; set; }
        public int VatCategoryId { get; set; }
        public string? Description { get; set; }
    }
}
