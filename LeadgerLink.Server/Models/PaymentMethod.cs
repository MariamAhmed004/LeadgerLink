using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("payment_methods")]
public partial class PaymentMethod
{
    [Key]
    [Column("payment_method_id")]
    public int PaymentMethodId { get; set; }

    [Column("payment_method")]
    [StringLength(50)]
    public string PaymentMethodName { get; set; } = null!;

    [InverseProperty("PaymentMethod")]
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();
}
