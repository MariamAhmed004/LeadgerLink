using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("VAT_category")]
public partial class VatCategory
{
    [Key]
    [Column("VAT_category_id")]
    public int VatCategoryId { get; set; }

    [Column("VAT_category")]
    [StringLength(150)]
    public string VatCategory1 { get; set; } = null!;

    [Column("VAT_rate", TypeName = "decimal(7, 3)")]
    public decimal VatRate { get; set; }

    [InverseProperty("VatCategory")]
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
