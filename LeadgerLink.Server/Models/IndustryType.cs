using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("industry_types")]
public partial class IndustryType
{
    [Key]
    [Column("industry_type_id")]
    public int IndustryTypeId { get; set; }

    [Column("industry_type")]
    [StringLength(250)]
    public string IndustryType1 { get; set; } = null!;

    [InverseProperty("IndustryType")]
    public virtual ICollection<Organization> Organizations { get; set; } = new List<Organization>();
}
