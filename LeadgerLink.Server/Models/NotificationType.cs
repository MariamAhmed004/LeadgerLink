using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("notification_types")]
public partial class NotificationType
{
    [Key]
    [Column("notification_type_id")]
    public int NotificationTypeId { get; set; }

    [Column("notification_type_name")]
    [StringLength(250)]
    public string NotificationTypeName { get; set; } = null!;

    [InverseProperty("NotificationType")]
    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
