using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace LeadgerLink.Server.Models;

public partial class LedgerLinkDbContext : DbContext
{
    public LedgerLinkDbContext()
    {
    }

    public LedgerLinkDbContext(DbContextOptions<LedgerLinkDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActionType> ActionTypes { get; set; }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<AuditLogLevel> AuditLogLevels { get; set; }

    public virtual DbSet<Driver> Drivers { get; set; }

    public virtual DbSet<IndustryType> IndustryTypes { get; set; }

    public virtual DbSet<InventoryItem> InventoryItems { get; set; }

    public virtual DbSet<InventoryItemCategory> InventoryItemCategories { get; set; }

    public virtual DbSet<InventoryTransfer> InventoryTransfers { get; set; }

    public virtual DbSet<InventoryTransferStatus> InventoryTransferStatuses { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<NotificationType> NotificationTypes { get; set; }

    public virtual DbSet<OperationalStatus> OperationalStatuses { get; set; }

    public virtual DbSet<Organization> Organizations { get; set; }

    public virtual DbSet<PaymentMethod> PaymentMethods { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Recipe> Recipes { get; set; }

    public virtual DbSet<RecipeInventoryItem> RecipeInventoryItems { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Sale> Sales { get; set; }

    public virtual DbSet<SaleItem> SaleItems { get; set; }

    public virtual DbSet<Store> Stores { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<TransferItem> TransferItems { get; set; }

    public virtual DbSet<Unit> Units { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<VatCategory> VatCategories { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseSqlServer("Data Source=(localdb)\\MSSQLLocalDB;Database=LedgerLinkDB;Trusted_Connection=True;");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ActionType>(entity =>
        {
            entity.HasKey(e => e.ActionTypeId).HasName("PK_action_type");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.Property(e => e.AuditLogId).ValueGeneratedNever();

            entity.HasOne(d => d.ActionType).WithMany(p => p.AuditLogs).HasConstraintName("FK_audit_log_action_type");

            entity.HasOne(d => d.AuditLogLevel).WithMany(p => p.AuditLogs).HasConstraintName("FK_audit_log_audit_log_level");

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs).HasConstraintName("FK_audit_log_user");
        });

        modelBuilder.Entity<AuditLogLevel>(entity =>
        {
            entity.HasKey(e => e.AuditLogLevelId).HasName("PK_audit_log_level");
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.HasKey(e => e.DriverId).HasName("PK_Driver");

            entity.Property(e => e.DriverId).ValueGeneratedNever();

            entity.HasOne(d => d.Store).WithMany(p => p.Drivers).HasConstraintName("FK_Driver_store");
        });

        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.HasOne(d => d.InventoryItemCategory).WithMany(p => p.InventoryItems).HasConstraintName("FK_inventory_item_inventory_item_categories");

            entity.HasOne(d => d.Store).WithMany(p => p.InventoryItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_inventory_item_store");

            entity.HasOne(d => d.Supplier).WithMany(p => p.InventoryItems).HasConstraintName("FK_inventory_item_Supplier");

            entity.HasOne(d => d.Unit).WithMany(p => p.InventoryItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_inventory_item_unit");

            entity.HasOne(d => d.User).WithMany(p => p.InventoryItems).HasConstraintName("FK_inventory_item_user_02");
        });

        modelBuilder.Entity<InventoryTransfer>(entity =>
        {
            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.InventoryTransferApprovedByNavigations).HasConstraintName("FK_inventory_transfer_user_02");

            entity.HasOne(d => d.Driver).WithMany(p => p.InventoryTransfers).HasConstraintName("FK_inventory_transfer_Driver");

            entity.HasOne(d => d.FromStoreNavigation).WithMany(p => p.InventoryTransferFromStoreNavigations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_inventory_transfer_fromStore");

            entity.HasOne(d => d.InventoryTransferStatus).WithMany(p => p.InventoryTransfers)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_inventory_transfer_inventory_transfer_statuses");

            entity.HasOne(d => d.RequestedByNavigation).WithMany(p => p.InventoryTransferRequestedByNavigations).HasConstraintName("FK_inventory_transfer_user");

            entity.HasOne(d => d.ToStoreNavigation).WithMany(p => p.InventoryTransferToStoreNavigations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_inventory_transfer_toStore");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PK_Notification");

            entity.HasOne(d => d.NotificationType).WithMany(p => p.Notifications)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_notification_notification_types");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications).HasConstraintName("FK_Notification_user");
        });

        modelBuilder.Entity<OperationalStatus>(entity =>
        {
            entity.Property(e => e.OperationalStatusId).ValueGeneratedNever();
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasOne(d => d.IndustryType).WithMany(p => p.Organizations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_organization_industry_types");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasOne(d => d.InventoryItem).WithMany(p => p.Products).HasConstraintName("FK_product_inventory_item");

            entity.HasOne(d => d.Recipe).WithMany(p => p.Products).HasConstraintName("FK_product_recipe_toSale");

            entity.HasOne(d => d.Store).WithMany(p => p.Products).HasConstraintName("FK_product_store");

            entity.HasOne(d => d.VatCategory).WithMany(p => p.Products)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_product_VAT_category");
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Recipes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_recipe_user_02");

            entity.HasOne(d => d.Store).WithMany(p => p.Recipes).HasConstraintName("FK_recipe_store");
        });

        modelBuilder.Entity<RecipeInventoryItem>(entity =>
        {
            entity.HasKey(e => e.RecipeInventoryItemId).HasName("PK_recipe_product");

            entity.HasOne(d => d.InventoryItem).WithMany(p => p.RecipeInventoryItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_recipe_inventory_item_inventory_item");

            entity.HasOne(d => d.Recipe).WithMany(p => p.RecipeInventoryItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_recipe_inventory_item_recipe");
        });

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.HasOne(d => d.PaymentMethod).WithMany(p => p.Sales).HasConstraintName("FK_sale_payment_methods");

            entity.HasOne(d => d.Store).WithMany(p => p.Sales)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_sale_branch");

            entity.HasOne(d => d.User).WithMany(p => p.Sales)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_sale_user");
        });

        modelBuilder.Entity<SaleItem>(entity =>
        {
            entity.HasOne(d => d.Product).WithMany(p => p.SaleItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_sale_item_product");

            entity.HasOne(d => d.Sale).WithMany(p => p.SaleItems)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_sale_item_sale");
        });

        modelBuilder.Entity<Store>(entity =>
        {
            entity.Property(e => e.StoreId).ValueGeneratedNever();

            entity.HasOne(d => d.OperationalStatus).WithMany(p => p.Stores)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_store_operational_statuses");

            entity.HasOne(d => d.Org).WithMany(p => p.Stores)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_store_organization");

            entity.HasOne(d => d.User).WithMany(p => p.Stores).HasConstraintName("FK_store_user");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK_Supplier");

            entity.Property(e => e.SupplierId).ValueGeneratedNever();

            entity.HasOne(d => d.Store).WithMany(p => p.Suppliers).HasConstraintName("FK_supplier_store");
        });

        modelBuilder.Entity<TransferItem>(entity =>
        {
            entity.HasOne(d => d.InventoryItem).WithMany(p => p.TransferItems).HasConstraintName("FK_transfer_item_inventory_item");

            entity.HasOne(d => d.InventoryTransfer).WithMany(p => p.TransferItems).HasConstraintName("FK_transfer_item_inventory_transfer");

            entity.HasOne(d => d.Recipe).WithMany(p => p.TransferItems).HasConstraintName("FK_transfer_item_recipe");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_user_role");

            entity.HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrgId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_user_organization");

            entity.HasOne(u => u.Store)
                .WithMany(s => s.Users)
                .HasForeignKey(u => u.StoreId)
                .HasConstraintName("FK_user_store")
                .OnDelete(DeleteBehavior.SetNull);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
