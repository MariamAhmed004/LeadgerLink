namespace LeadgerLink.Server.Dtos
{
    public class CreateInventoryItemDto
    {
        public string? inventoryItemName { get; set; }
        public string? shortDescription { get; set; }
        public int? supplierId { get; set; }
        public NewSupplierDto? newSupplier { get; set; }
        public int? inventoryItemCategoryId { get; set; }
        public int? unitId { get; set; }
        public decimal? quantity { get; set; }
        public decimal? costPerUnit { get; set; }
        // Optional client-supplied cost for product record
        public decimal? costPrice { get; set; }
        public decimal? minimumQuantity { get; set; }
        public bool isOnSale { get; set; }
        public decimal? sellingPrice { get; set; }
        public int? vatCategoryId { get; set; }
        public string? productDescription { get; set; }
        public int? storeId { get; set; }
    }
}
