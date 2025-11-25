namespace LeadgerLink.Server.Dtos
{
    public class LoggedInUserDto
    {
        public bool IsAuthenticated { get; set; }
        public string? UserName { get; set; }
        public string[] Roles { get; set; } = Array.Empty<string>();
        public string? FullName { get; set; }
        public int? UserId { get; set; }
    }
}
