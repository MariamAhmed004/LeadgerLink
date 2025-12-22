namespace LeadgerLink.Server.Dtos.UserDtos
{
    public class UpdateUserDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
        public int? StoreId { get; set; }
        public bool? ReassignStoreManager { get; set; } // indicator for store manager reassignment
    }
}
