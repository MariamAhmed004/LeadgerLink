using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    public class InventoryTransferRepository : IInventoryTransferRepository
    {
        private readonly LedgerLinkDbContext _context;

        public InventoryTransferRepository(LedgerLinkDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<int> CountTransfersByOrganizationAsync(int organizationId, DateTime? from = null, DateTime? to = null)
        {
            var q = _context.InventoryTransfers
                .AsQueryable();

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(t => t.RequestedAt >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(t => t.RequestedAt <= toDate);
            }

            // restrict to organization via store relations
            q = q.Where(t =>
                (t.FromStoreNavigation != null && t.FromStoreNavigation.OrgId == organizationId)
                || (t.ToStoreNavigation != null && t.ToStoreNavigation.OrgId == organizationId)
            );

            return await q.CountAsync();
        }

        public async Task<IEnumerable<InventoryTransferOverviewDto>> GetLatestForStoreAsync(int storeId, int pageSize)
        {
            var transfers = await _context.InventoryTransfers
                .Include(t => t.RequestedByNavigation)
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .Include(t => t.InventoryTransferStatus)
                .Where(t => t.FromStore == storeId || t.ToStore == storeId)
                .OrderByDescending(t => t.RequestedAt)
                .Take(pageSize)
                .Select(t => new InventoryTransferOverviewDto
                {
                    TransferId = t.InventoryTransferId,
                    Requester = t.RequestedByNavigation != null ? (t.RequestedByNavigation.UserFirstname + " " + t.RequestedByNavigation.UserLastname).Trim() : null,
                    FromStore = t.FromStoreNavigation != null ? t.FromStoreNavigation.StoreName : null,
                    ToStore = t.ToStoreNavigation != null ? t.ToStoreNavigation.StoreName : null,
                    Status = t.InventoryTransferStatus != null ? t.InventoryTransferStatus.TransferStatus : null,
                    RequestedAt = t.RequestedAt
                })
                .ToListAsync();

            return transfers;
        }

        public async Task<(IEnumerable<InventoryTransferListDto> Items, int TotalCount)> GetPagedForCurrentStoreAsync(
            int? resolvedStoreId,
            bool isOrgAdmin,
            int? orgId,
            string? flow,
            string? status,
            int page,
            int pageSize)
        {
            // Build base query with necessary includes
            var q = _context.InventoryTransfers
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .Include(t => t.InventoryTransferStatus)
                .Include(t => t.Driver)
                .Include(t => t.RequestedByNavigation)
                .AsQueryable();

            // Scoping:
            if (isOrgAdmin && !resolvedStoreId.HasValue)
            {
                // organization-level: restrict to transfers where either store belongs to the orgId
                if (!orgId.HasValue)
                {
                    return (Array.Empty<InventoryTransferListDto>(), 0);
                }

                var orgVal = orgId.Value;
                q = q.Where(t =>
                    (t.FromStoreNavigation != null && t.FromStoreNavigation.OrgId == orgVal)
                    || (t.ToStoreNavigation != null && t.ToStoreNavigation.OrgId == orgVal)
                );
            }
            else
            {
                // store-level: only transfers that involve the resolved store
                if (!resolvedStoreId.HasValue)
                {
                    return (Array.Empty<InventoryTransferListDto>(), 0);
                }

                var sId = resolvedStoreId.Value;
                q = q.Where(t => t.FromStore == sId || t.ToStore == sId);
            }

            // Flow filter (in / out) - only applies when resolvedStoreId is present
            if (!string.IsNullOrWhiteSpace(flow) && resolvedStoreId.HasValue)
            {
                var fl = flow.Trim().ToLowerInvariant();
                if (fl == "in")
                {
                    q = q.Where(t => t.ToStore == resolvedStoreId.Value);
                }
                else if (fl == "out")
                {
                    q = q.Where(t => t.FromStore == resolvedStoreId.Value);
                }
            }

            // Status filter
            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim().ToLowerInvariant();
                q = q.Where(t => t.InventoryTransferStatus != null && t.InventoryTransferStatus.TransferStatus.ToLower() == st);
            }

            // total count before paging
            var totalCount = await q.CountAsync();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var skip = (page - 1) * pageSize;

            var transfers = await q
                .OrderByDescending(t => t.RequestedAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            // Project to DTO with computed fields
            var list = transfers.Select(t =>
            {
                var dto = new InventoryTransferListDto
                {
                    TransferId = t.InventoryTransferId,
                    Status = t.InventoryTransferStatus?.TransferStatus,
                    RequestedAt = t.RequestedAt,
                    Requester = t.RequestedByNavigation != null ? (t.RequestedByNavigation.UserFirstname + " " + t.RequestedByNavigation.UserLastname).Trim() : null,
                    DriverName = t.Driver != null ? t.Driver.DriverName : "Not assigned"
                };

                if (resolvedStoreId.HasValue)
                {
                    var sId = resolvedStoreId.Value;
                    if (t.FromStore == sId && t.ToStore != sId)
                    {
                        dto.InOut = "Out";
                        dto.StoreInvolved = t.ToStoreNavigation?.StoreName;
                    }
                    else if (t.ToStore == sId && t.FromStore != sId)
                    {
                        dto.InOut = "In";
                        dto.StoreInvolved = t.FromStoreNavigation?.StoreName;
                    }
                    else
                    {
                        dto.InOut = "N/A";
                        dto.StoreInvolved = $"{t.FromStoreNavigation?.StoreName} → {t.ToStoreNavigation?.StoreName}";
                    }
                }
                else
                {
                    dto.InOut = "N/A";
                    dto.StoreInvolved = $"{t.FromStoreNavigation?.StoreName} → {t.ToStoreNavigation?.StoreName}";
                }

                return dto;
            }).ToList();

            return (list, totalCount);
        }

        public async Task<IEnumerable<string>> GetStatusesAsync()
        {
            var statuses = await _context.InventoryTransferStatuses
                .Where(s => s.TransferStatus != null)
                .Select(s => s.TransferStatus!)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            return statuses;
        }

        public async Task<InventoryTransferDetailDto?> GetDetailByIdAsync(int inventoryTransferId)
        {
            var q = _context.InventoryTransfers
                .Include(t => t.FromStoreNavigation)
                .Include(t => t.ToStoreNavigation)
                .Include(t => t.InventoryTransferStatus)
                .Include(t => t.Driver)
                .Include(t => t.RequestedByNavigation)
                .Include(t => t.ApprovedByNavigation)
                .Include(t => t.TransferItems)
                    .ThenInclude(it => it.InventoryItem)
                .Include(t => t.TransferItems)
                    .ThenInclude(it => it.Recipe)
                .AsNoTracking()
                .Where(t => t.InventoryTransferId == inventoryTransferId);

            var result = await q.Select(t => new InventoryTransferDetailDto
            {
                TransferId = t.InventoryTransferId,
                FromStoreName = t.FromStoreNavigation != null ? t.FromStoreNavigation.StoreName : null,
                ToStoreName = t.ToStoreNavigation != null ? t.ToStoreNavigation.StoreName : null,
                TransferDate = t.TransferDate,
                Status = t.InventoryTransferStatus != null ? t.InventoryTransferStatus.TransferStatus : null,
                RequestedAt = t.RequestedAt,
                RecievedAt = t.RecievedAt,
                Notes = t.Notes,
                RequestedByName = t.RequestedByNavigation != null ? ((t.RequestedByNavigation.UserFirstname ?? "") + " " + (t.RequestedByNavigation.UserLastname ?? "")).Trim() : null,
                ApprovedByName = t.ApprovedByNavigation != null ? ((t.ApprovedByNavigation.UserFirstname ?? "") + " " + (t.ApprovedByNavigation.UserLastname ?? "")).Trim() : null,
                DriverName = t.Driver != null ? t.Driver.DriverName : null,
                DriverEmail = t.Driver != null ? t.Driver.DriverEmail : null,
                Items = t.TransferItems.Select(it => new InventoryTransferItemDto
                {
                    TransferItemId = it.TransferItemId,
                    InventoryItemId = it.InventoryItemId,
                    InventoryItemName = it.InventoryItem != null ? it.InventoryItem.InventoryItemName : null,
                    Quantity = it.Quantity,
                    IsRequested = it.IsRequested,
                    RecipeId = it.RecipeId,
                    RecipeName = it.Recipe != null ? it.Recipe.RecipeName : null
                }).ToList()
            }).FirstOrDefaultAsync();

            return result;
        }

        public async Task UpdateTransferItemsAsync(int transferId, IEnumerable<CreateInventoryTransferItemDto> items)
        {
            // Replace-all strategy: remove existing TransferItems and insert the new set.
            var existing = await _context.TransferItems
                .Where(ti => ti.InventoryTransferId == transferId)
                .ToListAsync();

            if (existing.Count > 0)
            {
                _context.TransferItems.RemoveRange(existing);
            }

            foreach (var it in items ?? Enumerable.Empty<CreateInventoryTransferItemDto>())
            {
                if (it == null) continue;
                var qty = it.Quantity;
                if (qty <= 0) continue;

                var entity = new TransferItem
                {
                    InventoryTransferId = transferId,
                    Quantity = qty,
                    IsRequested = true,
                    RecipeId = it.RecipeId,
                    InventoryItemId = it.InventoryItemId
                };
                _context.TransferItems.Add(entity);
            }

            await _context.SaveChangesAsync();
        }
        public async Task UpdateTransferAsync(int transferId, CreateInventoryTransferDto dto)
        {
            var transfer = await _context.InventoryTransfers.FindAsync(transferId);
            if (transfer == null) throw new KeyNotFoundException($"Transfer {transferId} not found.");

            // Map store ids if provided
            if (dto.RequesterStoreId.HasValue)
            {
                transfer.ToStore = dto.RequesterStoreId.Value;
            }

            if (dto.FromStoreId.HasValue)
            {
                transfer.FromStore = dto.FromStoreId.Value;
            }

            // Parse date similar to Create endpoint (set RequestedAt)
            if (!string.IsNullOrWhiteSpace(dto.Date) && DateTime.TryParse(dto.Date, out var parsedDate))
            {
                transfer.RequestedAt = parsedDate;
            }

            // Notes
            if (dto.Notes != null)
            {
                transfer.Notes = dto.Notes.Trim();
            }

            // Status -> resolve status id if supplied (trim both sides to tolerate trailing spaces)
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var requested = dto.Status.Trim().ToLowerInvariant();
                var st = await _context.InventoryTransferStatuses
                    .AsQueryable()
                    .FirstOrDefaultAsync(s => (s.TransferStatus ?? string.Empty).Trim().ToLower() == requested);

                if (st != null)
                {
                    transfer.InventoryTransferStatusId = st.TransferStatusId;
                }
                else
                {
                    // No matching status found — do not change existing status id.
                    // Optionally log if you have a logger in this repository.
                }
            }

            _context.InventoryTransfers.Update(transfer);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateTransferItemsAsync(int transferId, CreateInventoryTransferItemDto[] items)
        {
            // Remove existing transfer items for this transfer
            var existing = await _context.TransferItems
                .Where(ti => ti.InventoryTransferId == transferId)
                .ToListAsync();

            if (existing.Any())
            {
                _context.TransferItems.RemoveRange(existing);
                await _context.SaveChangesAsync();
            }

            // Add new items
            var toAdd = new List<TransferItem>();
            foreach (var it in items ?? Array.Empty<CreateInventoryTransferItemDto>())
            {
                var qty = it.Quantity;
                if (qty <= 0) continue;

                var ti = new TransferItem
                {
                    InventoryTransferId = transferId,
                    Quantity = qty,
                    IsRequested = true
                };

                if (it.RecipeId.HasValue) ti.RecipeId = it.RecipeId.Value;
                if (it.InventoryItemId.HasValue) ti.InventoryItemId = it.InventoryItemId.Value;

                toAdd.Add(ti);
            }

            if (toAdd.Any())
            {
                await _context.TransferItems.AddRangeAsync(toAdd);
                await _context.SaveChangesAsync();
            }
        }

        public async Task ApproveTransferAsync(
    int transferId,
    int? driverId,
    string? newDriverName,
    string? newDriverEmail,
    IEnumerable<CreateInventoryTransferItemDto> items,
    string? notes)
        {
            var transfer = await _context.InventoryTransfers
                .FirstOrDefaultAsync(t => t.InventoryTransferId == transferId);

            if (transfer == null) throw new KeyNotFoundException($"Transfer {transferId} not found.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                int? assignedDriverId = driverId;

                // Create new driver when no driverId provided but name+email are supplied.
                if (!assignedDriverId.HasValue && !string.IsNullOrWhiteSpace(newDriverName) && !string.IsNullOrWhiteSpace(newDriverEmail))
                {
                    var emailLower = newDriverEmail.Trim().ToLowerInvariant();

                    // Reuse existing driver with same email + store if present, otherwise create.
                    var existing = await _context.Drivers
                        .FirstOrDefaultAsync(d => d.DriverEmail != null
                                                  && d.StoreId == transfer.FromStore
                                                  && d.DriverEmail.ToLower() == emailLower);

                    if (existing != null)
                    {
                        assignedDriverId = existing.DriverId;
                    }
                    else
                    {
                        var drv = new Driver
                        {
                            DriverName = newDriverName.Trim(),
                            DriverEmail = newDriverEmail.Trim(),
                            StoreId = transfer.FromStore
                        };
                        _context.Drivers.Add(drv);
                        await _context.SaveChangesAsync();
                        assignedDriverId = drv.DriverId;
                    }
                }
                else if (assignedDriverId.HasValue)
                {
                    // validate presence of supplied driver id
                    var exists = await _context.Drivers.AnyAsync(d => d.DriverId == assignedDriverId.Value);
                    if (!exists) throw new KeyNotFoundException($"Driver {assignedDriverId.Value} not found.");
                }

                // assign driver if available
                if (assignedDriverId.HasValue)
                {
                    transfer.DriverId = assignedDriverId.Value;
                }

                // override notes if provided
                if (notes != null)
                {
                    transfer.Notes = notes.Trim();
                }

                // set status to Approved when possible
                var approved = await _context.InventoryTransferStatuses
                    .FirstOrDefaultAsync(s => (s.TransferStatus ?? string.Empty).Trim().ToLower() == "approved");
                if (approved != null)
                {
                    transfer.InventoryTransferStatusId = approved.TransferStatusId;
                }

                _context.InventoryTransfers.Update(transfer);
                await _context.SaveChangesAsync();

                // append provided items as sent items (IsRequested = false)
                if (items != null)
                {
                    var toAdd = new List<TransferItem>();
                    foreach (var it in items)
                    {
                        if (it == null) continue;
                        if (it.Quantity <= 0) continue;

                        var ti = new TransferItem
                        {
                            InventoryTransferId = transferId,
                            Quantity = it.Quantity,
                            IsRequested = false
                        };

                        if (it.RecipeId.HasValue) ti.RecipeId = it.RecipeId.Value;
                        if (it.InventoryItemId.HasValue) ti.InventoryItemId = it.InventoryItemId.Value;

                        toAdd.Add(ti);
                    }

                    if (toAdd.Count > 0)
                    {
                        await _context.TransferItems.AddRangeAsync(toAdd);
                        await _context.SaveChangesAsync();
                    }
                }

                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task RejectTransferAsync(int transferId, string? notes = null)
        {
            var transfer = await _context.InventoryTransfers
                .FirstOrDefaultAsync(t => t.InventoryTransferId == transferId);

            if (transfer == null) throw new KeyNotFoundException($"Transfer {transferId} not found.");

            // override notes when supplied
            if (notes != null)
            {
                transfer.Notes = notes.Trim();
            }

            // set status to Rejected when possible
            var rejected = await _context.InventoryTransferStatuses
                .FirstOrDefaultAsync(s => (s.TransferStatus ?? string.Empty).Trim().ToLower() == "rejected");
            if (rejected != null)
            {
                transfer.InventoryTransferStatusId = rejected.TransferStatusId;
            }

            _context.InventoryTransfers.Update(transfer);
            await _context.SaveChangesAsync();
        }

    }
}