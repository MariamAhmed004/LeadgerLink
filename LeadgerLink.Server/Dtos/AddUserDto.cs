namespace LeadgerLink.Server.Dtos
{
    // DTO used when creating a new user.
    public class AddUserDto
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string? Role { get; set; }

        // Additional domain fields
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int? StoreId { get; set; }
        public int? OrgId { get; set; }
        public string? Phone { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
