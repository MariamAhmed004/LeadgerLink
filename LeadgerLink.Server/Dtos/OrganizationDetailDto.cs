using System;

namespace LeadgerLink.Server.Dtos
{
    // DTO returned by the organizations API detail endpoint (used by the client view page).
    public class OrganizationDetailDto
    {
        public int OrgId { get; set; }
        public string? OrgName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? IndustryTypeName { get; set; }
        public string? RegestirationNumber { get; set; }
        public DateTime? EstablishmentDate { get; set; }
        public string? WebsiteUrl { get; set; }
        public DateTime CreatedAt { get; set; }

        // View-specific fields
        public string? OrganizationAdminName { get; set; }
        public int StoresCount { get; set; }
        public int UsersCount { get; set; }
    }
}