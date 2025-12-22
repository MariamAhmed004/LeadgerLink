using System;

namespace LeadgerLink.Server.Dtos.StoreDtos
{
    /// <summary>
    /// DTO used to create a Store. Contains only scalar values the client should send.
    /// Server will resolve and enforce OrgId and other server-side values.
    /// </summary>
    public class StoreCreateDto
    {
        public string? StoreName { get; set; }

        // Required on the client (server still validates)
        public int OperationalStatusId { get; set; }

        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }

        // Optional manager user id (domain user id)
        public int? UserId { get; set; }

        // Optional opening date
        public DateTime? OpeningDate { get; set; }

        public string? WorkingHours { get; set; }
        public string? Location { get; set; }
    }
}