using Microsoft.AspNetCore.Http;

namespace LeadgerLink.Server.Dtos
{
    public class UploadInventoryItemsDto
    {
        public IFormFile File { get; set; } = null!;
        public int? StoreId { get; set; }
    }
}