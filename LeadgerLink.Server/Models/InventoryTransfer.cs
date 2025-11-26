using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("inventory_transfer")]
[Index("RequestedBy", Name = "IXFK_inventory_transfer_user")]
[Index("ApprovedBy", Name = "IXFK_inventory_transfer_user_02")]
public partial class InventoryTransfer
{
    [Key]
    [Column("inventory_transfer_id")]
    public int InventoryTransferId { get; set; }

    [Column("from_store")]
    public int FromStore { get; set; }

    [Column("to_store")]
    public int ToStore { get; set; }

    [Column("transfer_date")]
    public DateOnly? TransferDate { get; set; }

    [Column("inventory_transfer_status_id")]
    public int InventoryTransferStatusId { get; set; }

    [Column("requested_at")]
    public DateTime? RequestedAt { get; set; }

    [Column("notes")]
    [StringLength(950)]
    public string? Notes { get; set; }

    [Column("requested_by")]
    public int? RequestedBy { get; set; }

    [Column("approved_by")]
    public int? ApprovedBy { get; set; }

    [Column("driver_id")]
    public int? DriverId { get; set; }

    [Column("recieved_at")]
    public DateTime? RecievedAt { get; set; }

    [ForeignKey("ApprovedBy")]
    [InverseProperty("InventoryTransferApprovedByNavigations")]
    public virtual User? ApprovedByNavigation { get; set; }

    [ForeignKey("DriverId")]
    [InverseProperty("InventoryTransfers")]
    public virtual Driver? Driver { get; set; }

    [ForeignKey("FromStore")]
    [InverseProperty("InventoryTransferFromStoreNavigations")]
    public virtual Store FromStoreNavigation { get; set; } = null!;

    [ForeignKey("InventoryTransferStatusId")]
    [InverseProperty("InventoryTransfers")]
    public virtual InventoryTransferStatus InventoryTransferStatus { get; set; } = null!;

    [ForeignKey("RequestedBy")]
    [InverseProperty("InventoryTransferRequestedByNavigations")]
    public virtual User? RequestedByNavigation { get; set; }

    [ForeignKey("ToStore")]
    [InverseProperty("InventoryTransferToStoreNavigations")]
    public virtual Store ToStoreNavigation { get; set; } = null!;

    [InverseProperty("InventoryTransfer")]
    public virtual ICollection<TransferItem> TransferItems { get; set; } = new List<TransferItem>();
}
