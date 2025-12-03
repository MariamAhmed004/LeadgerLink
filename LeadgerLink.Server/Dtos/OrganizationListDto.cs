using System;

namespace LeadgerLink.Server.Dtos
{
    // Lightweight DTO used for organization listing (includes industry type name + counts).
    public class OrganizationListDto
    {
        public int OrgId { get; set; }
        public string? OrgName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? IndustryTypeName { get; set; }
        public DateTime CreatedAt { get; set; }

        // Additional fields useful in the list UI
        public int StoresCount { get; set; }
        public int UsersCount { get; set; }
    }
}
