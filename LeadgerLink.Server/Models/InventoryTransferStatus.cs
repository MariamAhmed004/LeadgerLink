using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("inventory_transfer_statuses")]
public partial class InventoryTransferStatus
{
    [Key]
    [Column("transfer_status_id")]
    public int TransferStatusId { get; set; }

    [Column("transfer_status")]
    [StringLength(50)]
    public string TransferStatus { get; set; } = null!;

    [InverseProperty("InventoryTransferStatus")]
    public virtual ICollection<InventoryTransfer> InventoryTransfers { get; set; } = new List<InventoryTransfer>();
}
