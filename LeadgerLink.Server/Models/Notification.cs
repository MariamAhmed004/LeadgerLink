using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

[Table("notification")]
[Index("UserId", Name = "IXFK_Notification_user")]
[Index("NotificationTypeId", Name = "IXFK_notification_notification_types")]
public partial class Notification
{
    [Key]
    [Column("notification_id")]
    public int NotificationId { get; set; }

    [Column("subject")]
    [StringLength(550)]
    public string? Subject { get; set; }

    [Column("message")]
    public string? Message { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("isRead")]
    public bool IsRead { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("notification_type_id")]
    public int NotificationTypeId { get; set; }

    [ForeignKey("NotificationTypeId")]
    [InverseProperty("Notifications")]
    public virtual NotificationType NotificationType { get; set; } = null!;

    [ForeignKey("UserId")]
    [InverseProperty("Notifications")]
    public virtual User? User { get; set; }
}
