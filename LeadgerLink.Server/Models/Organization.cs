using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("organization")]
[Index("IndustryTypeId", Name = "IXFK_organization_industry_types")]
public partial class Organization
{
    [Key]
    [Column("org_id")]
    public int OrgId { get; set; }

    [Column("org_name")]
    [StringLength(100)]
    public string OrgName { get; set; } = null!;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("email")]
    [StringLength(250)]
    public string? Email { get; set; }

    [Column("phone")]
    [StringLength(50)]
    public string? Phone { get; set; }

    [Column("regestiration_number")]
    [StringLength(50)]
    public string? RegestirationNumber { get; set; }

    [Column("establishment_date")]
    public DateTime? EstablishmentDate { get; set; }

    [Column("website_url")]
    [StringLength(250)]
    public string? WebsiteUrl { get; set; }

    [Column("industry_type_id")]
    public int IndustryTypeId { get; set; }

    [ForeignKey("IndustryTypeId")]
    [InverseProperty("Organizations")]
    public virtual IndustryType? IndustryType { get; set; } 

    [InverseProperty("Org")]
    public virtual ICollection<Store> Stores { get; set; } = new List<Store>();

    [InverseProperty("Organization")]
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
