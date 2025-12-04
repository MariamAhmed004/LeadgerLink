using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos
{
    public class ProductDetailDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal? SellingPrice { get; set; }
        public decimal? CostPrice { get; set; }
        public int? StoreId { get; set; }
        public string? StoreName { get; set; }
        public bool IsRecipe { get; set; }
        public int? RecipeId { get; set; }
        public int? InventoryItemId { get; set; }
        public string? RecipeName { get; set; }
        public string? InventoryItemName { get; set; }
        public string? Description { get; set; }
        public int VatCategoryId { get; set; }
    }
}
