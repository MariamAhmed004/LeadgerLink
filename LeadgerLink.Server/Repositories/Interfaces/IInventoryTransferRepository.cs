using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;

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

        // Update transfer data by transfer id.
        Task UpdateTransferAsync(int transferId, CreateInventoryTransferDto dto);

        // Approve a transfer:
        // - If a driverId is provided it will be assigned to the transfer.
        // - If driverId is null and newDriverName/newDriverEmail are provided, repository implementation
        //   is expected to create the driver (assign to transfer.FromStore) and use the created id.
        // - Adds the provided items to TransferItems (these represent items being sent) and sets IsRequested=false for them.
        // - Updates transfer status to "Approved" and updates notes (override).
        Task ApproveTransferAsync(
            int transferId,
            int? driverId,
            string? newDriverName,
            string? newDriverEmail,
            IEnumerable<CreateInventoryTransferItemDto> items,
            string? notes,
            int loggedInUser);

        // Reject a transfer: update its status to "Rejected" and optionally override notes.
        Task RejectTransferAsync(int transferId, string? notes = null);

        // Fetch transfer status by name.
        Task<InventoryTransferStatus?> GetTransferStatusByNameAsync(string statusName);

        // Add a new inventory transfer.
        Task<InventoryTransfer> AddTransferAsync(InventoryTransfer transfer);

        // Add a new transfer item.
        Task AddTransferItemAsync(TransferItem transferItem);

        Task<InventoryTransfer?> GetTransferWithStoresAsync(int transferId);

        Task<(List<(int InventoryItemId, decimal Quantity)> InventoryItems, List<(int RecipeId, decimal Quantity)> Recipes)> DistributeTransferItemsAsync(int transferId, bool isRequested);

        Task SetTransferToDeliveredAsync(int transferId);

        Task<IEnumerable<InventoryTransferOverviewDto>> GetLatestForOrganizationAsync(int organizationId, int maxCount = 6);
    } 
}