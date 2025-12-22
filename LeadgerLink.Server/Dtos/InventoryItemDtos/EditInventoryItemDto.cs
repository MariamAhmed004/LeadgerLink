namespace LeadgerLink.Server.Dtos.InventoryItemDtos
{
    public class NewSupplierDto
    {
        public string? name { get; set; }
        public string? contactMethod { get; set; }
    }

    public class EditInventoryItemDto
    {
        public string? inventoryItemName { get; set; }
        public string? shortDescription { get; set; }
        public int? supplierId { get; set; }
        public NewSupplierDto? editSupplier { get; set; }
        public int? inventoryItemCategoryId { get; set; }
        public int? unitId { get; set; }
        public decimal? quantity { get; set; }
        public decimal? costPerUnit { get; set; }
        public decimal? costPrice { get; set; }
        public decimal? minimumQuantity { get; set; }
        public bool isOnSale { get; set; }
        public decimal? sellingPrice { get; set; }
        public int? vatCategoryId { get; set; }
        public string? productDescription { get; set; }
    }
}
