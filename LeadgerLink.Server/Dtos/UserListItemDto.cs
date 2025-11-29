namespace LeadgerLink.Server.Dtos
{
    // DTO to populate "Created By" filter select on the client.
    public class UserListItemDto
    {
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
    }
}