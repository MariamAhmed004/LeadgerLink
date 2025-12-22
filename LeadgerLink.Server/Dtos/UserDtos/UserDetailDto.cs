using System;

namespace LeadgerLink.Server.Dtos.UserDtos
{
    // DTO used by the client for the user detail view.
    // Added FirstName, LastName and StoreName (backwards-compatible).
    public class UserDetailDto
    {
        public int UserId { get; set; }
        public string? FullName { get; set; }

        // New discrete name properties (backwards-compatible)
        public string? FirstName { get; set; }
        public string? LastName { get; set; }

        // New store name (nullable)
        public string? StoreName { get; set; }

        public string? Email { get; set; }
        public string? Phone { get; set; }

        // Role title (e.g. "Store Manager")
        public string? Role { get; set; }

        // Organization name (nullable when user has no OrgId)
        public string? OrganizationName { get; set; }

        // Account status and timestamps
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? OrgId { get; set; }
        public int? StoreId { get; set; }

    }
}