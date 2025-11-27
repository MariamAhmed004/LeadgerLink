using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for inventory transfer operations.
    public class InventoryTransferRepository : Repository<InventoryTransfer>, IInventoryTransferRepository
    {
        private readonly LedgerLinkDbContext _context;

        public InventoryTransferRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Approve a transfer: set ApprovedBy, mark received and set the "Approved" status if available.
        public async Task ApproveTransferAsync(int transferId, int approvingUserId)
        {
            var transfer = await _context.InventoryTransfers.FindAsync(transferId);
            if (transfer == null) return;

            transfer.ApprovedBy = approvingUserId;
            transfer.RecievedAt = DateTime.UtcNow;

            var approvedStatus = await _context.InventoryTransferStatuses
                .FirstOrDefaultAsync(s => s.TransferStatus.ToLower() == "approved");

            if (approvedStatus != null)
            {
                transfer.InventoryTransferStatusId = approvedStatus.TransferStatusId;
            }

            _context.InventoryTransfers.Update(transfer);
            await _context.SaveChangesAsync();
        }

        // Count transfers that involve stores belonging to a given organization.
        public async Task<int> CountTransfersByOrganizationAsync(int organizationId)
        {
            return await CountTransfersByOrganizationAsync(organizationId, null, null);
        }

        // Count transfers that involve stores belonging to a given organization with optional date range.
        public async Task<int> CountTransfersByOrganizationAsync(int organizationId, DateTime? from, DateTime? to)
        {
            var q = _context.InventoryTransfers
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .AsQueryable();

            q = q.Where(t =>
                (t.FromStoreNavigation != null && t.FromStoreNavigation.OrgId == organizationId)
                || (t.ToStoreNavigation != null && t.ToStoreNavigation.OrgId == organizationId)
            );

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(t => t.RequestedAt.HasValue && t.RequestedAt.Value >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(t => t.RequestedAt.HasValue && t.RequestedAt.Value <= toDate);
            }

            return await q.CountAsync();
        }

        // Return quarterly inventory movement totals (grouped by month) for an organization.
        public async Task<IEnumerable<MonthlyInventoryMovementDto>> GetQuarterlyInventoryMovementsAsync(int organizationId, int year, int quarter)
        {
            if (quarter < 1 || quarter > 4) return Array.Empty<MonthlyInventoryMovementDto>();

            var startMonth = (quarter - 1) * 3 + 1;
            var months = new[] { startMonth, startMonth + 1, startMonth + 2 };

            var query = from ti in _context.TransferItems
                        join tr in _context.InventoryTransfers on ti.InventoryTransferId equals tr.InventoryTransferId
                        where tr.RequestedAt.HasValue
                              && tr.RequestedAt.Value.Year == year
                              && months.Contains(tr.RequestedAt.Value.Month)
                              && ((tr.FromStoreNavigation != null && tr.FromStoreNavigation.OrgId == organizationId)
                                  || (tr.ToStoreNavigation != null && tr.ToStoreNavigation.OrgId == organizationId))
                        group ti by tr.RequestedAt.Value.Month into g
                        select new MonthlyInventoryMovementDto
                        {
                            Month = g.Key,
                            TotalQuantity = g.Sum(x => (decimal?)(x.Quantity ?? 0m)) ?? 0m
                        };

            var list = await query.OrderBy(m => m.Month).ToListAsync();
            return list;
        }

        // Return transfer including its items and related inventory item / recipe details.
        public async Task<InventoryTransfer> GetTransferWithItemsAsync(int transferId)
        {
            return await _context.InventoryTransfers
                .Include(t => t.TransferItems)
                    .ThenInclude(ti => ti.InventoryItem)
                .Include(t => t.TransferItems)
                    .ThenInclude(ti => ti.Recipe)
                .FirstOrDefaultAsync(t => t.InventoryTransferId == transferId);
        }

        // Reject a transfer: set status to "Rejected" if available and mark who rejected it.
        public async Task RejectTransferAsync(int transferId, int rejectingUserId)
        {
            var transfer = await _context.InventoryTransfers.FindAsync(transferId);
            if (transfer == null) return;

            transfer.ApprovedBy = rejectingUserId;
            transfer.RecievedAt = DateTime.UtcNow;

            var rejectedStatus = await _context.InventoryTransferStatuses
                .FirstOrDefaultAsync(s => s.TransferStatus.ToLower() == "rejected");

            if (rejectedStatus != null)
            {
                transfer.InventoryTransferStatusId = rejectedStatus.TransferStatusId;
            }

            _context.InventoryTransfers.Update(transfer);
            await _context.SaveChangesAsync();
        }
    }
}