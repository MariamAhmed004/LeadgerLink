namespace LeadgerLink.Server.Dtos.UserDtos
{
    public class LoggedInUserDto
    {
        public bool IsAuthenticated { get; set; }
        public string? UserName { get; set; }
        public string[] Roles { get; set; } = System.Array.Empty<string>();
        public string? FullName { get; set; }
        public int? UserId { get; set; }

        // Added to expose the organization id for the logged-in user
        public int? OrgId { get; set; }
        public int? StoreId { get; set; }
    }
}
