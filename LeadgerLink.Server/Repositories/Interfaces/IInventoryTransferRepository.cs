using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for inventory transfer operations.
    public interface IInventoryTransferRepository : IRepository<InventoryTransfer>
    {
        // Approve a transfer with the given id by the specified approving user.
        Task ApproveTransferAsync(int transferId, int approvingUserId);

        // Return count of transfers for an organization.
        Task<int> CountTransfersByOrganizationAsync(int organizationId);

        // Return quarterly inventory movement summaries for an organization.
        Task<IEnumerable<MonthlyInventoryMovementDto>> GetQuarterlyInventoryMovementsAsync(int organizationId, int year, int quarter);

        // Return a transfer including its items.
        Task<InventoryTransfer> GetTransferWithItemsAsync(int transferId);

        // Reject a transfer with the given id by the specified rejecting user.
        Task RejectTransferAsync(int transferId, int rejectingUserId);
    }
}