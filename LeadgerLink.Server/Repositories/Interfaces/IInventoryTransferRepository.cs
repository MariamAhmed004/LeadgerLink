using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for inventory transfer operations (read-focused surface).
    public interface IInventoryTransferRepository
    {
        // Count transfers by organization with optional date range.
        Task<int> CountTransfersByOrganizationAsync(int organizationId, DateTime? from = null, DateTime? to = null);

        // Return latest transfers that involve the given store (limit by pageSize).
        Task<IEnumerable<InventoryTransferOverviewDto>> GetLatestForStoreAsync(int storeId, int pageSize);

        // Returns paged list and total count for current-store listing.
        // Parameters:
        // - resolvedStoreId: store id to scope to (null when organization-level listing).
        // - isOrgAdmin: whether caller is org admin (affects scoping).
        // - orgId: caller's organization id when applicable.
        // - flow/status/paging as per controller.
        Task<(IEnumerable<InventoryTransferListDto> Items, int TotalCount)> GetPagedForCurrentStoreAsync(
            int? resolvedStoreId,
            bool isOrgAdmin,
            int? orgId,
            string? flow,
            string? status,
            int page,
            int pageSize);

        // Distinct statuses for client filters.
        Task<IEnumerable<string>> GetStatusesAsync();

        // Return detailed transfer by id including related entities and transfer items.
        Task<InventoryTransferDetailDto?> GetDetailByIdAsync(int inventoryTransferId);

        // Update transfer items for a transfer id with the provided selection (replace-all strategy).
        Task UpdateTransferItemsAsync(int transferId, IEnumerable<CreateInventoryTransferItemDto> items);
    }
}