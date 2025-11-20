using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("sale_item")]
public partial class SaleItem
{
    [Key]
    [Column("sale_item")]
    public int SaleItem1 { get; set; }

    [Column("sale_id")]
    public int SaleId { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("quantity", TypeName = "decimal(18, 2)")]
    public decimal Quantity { get; set; }

    [ForeignKey("ProductId")]
    [InverseProperty("SaleItems")]
    public virtual Product Product { get; set; } = null!;

    [ForeignKey("SaleId")]
    [InverseProperty("SaleItems")]
    public virtual Sale Sale { get; set; } = null!;
}
