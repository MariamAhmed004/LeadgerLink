using System;

namespace LeadgerLink.Server.Dtos
{
    // DTO used by the client for the user detail view.
    public class UserDetailDto
    {
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }

        // Role title (e.g. "Store Manager")
        public string? Role { get; set; }

        // Organization name (nullable when user has no OrgId)
        public string? OrganizationName { get; set; }

        // Account status and timestamps
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}