using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Dtos.InventoryTransferDtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/inventorytransfers")]
    public class InventoryTransfersController : ControllerBase
    {
        // Repository for managing inventory transfers
        private readonly IInventoryTransferRepository _repository;

        // Database context for direct data access
        private readonly LedgerLinkDbContext _context;

        // Logger for logging errors and information
        private readonly ILogger<InventoryTransfersController> _logger;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Repository for user-specific queries
        private readonly IUserRepository _userRepository;

        // Constructor to initialize dependencies
        public InventoryTransfersController(IInventoryTransferRepository repository, LedgerLinkDbContext context, ILogger<InventoryTransfersController> logger, IAuditContext auditContext, IUserRepository userRepository)
        {
            _repository = repository;
            _context = context;
            _logger = logger;
            _auditContext = auditContext;
            _userRepository = userRepository;
        }

        // GET api/inventorytransfers/count
        // Counts the number of inventory transfers for a given organization within an optional date range.
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int organizationId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                // Fetch the count of transfers
                var c = await _repository.CountTransfersByOrganizationAsync(organizationId, from, to);

                // Return the result
                return Ok(c);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to count inventory transfers");
                return StatusCode(500, "Failed to count inventory transfers");
            }
        }

        // GET api/inventorytransfers/latest-for-current-store
        // Retrieves the latest inventory transfers for the authenticated user's store.
        [Authorize]
        [HttpGet("latest-for-current-store")]
        public async Task<ActionResult<IEnumerable<InventoryTransferOverviewDto>>> GetLatestForCurrentStore([FromQuery] int pageSize = 5)
        {
            const int MaxPageSize = 50;

            // Validate page size
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null || !domainUser.StoreId.HasValue) return Ok(Array.Empty<InventoryTransferOverviewDto>());

            var storeId = domainUser.StoreId.Value;

            try
            {
                // Fetch the latest transfers
                var transfers = await _repository.GetLatestForStoreAsync(storeId, pageSize);

                // Return the result
                return Ok(transfers);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load latest inventory transfers");
                return StatusCode(500, "Failed to load latest inventory transfers");
            }
        }

        // GET api/inventorytransfers/list-for-current-store
        // Retrieves paged inventory transfers for the authenticated user's store with optional filters.
        [Authorize]
        [HttpGet("list-for-current-store")]
        public async Task<ActionResult> ListForCurrentStore(
            [FromQuery] string? flow = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] int? storeId = null)
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Ok(new { items = Array.Empty<InventoryTransferListDto>(), totalCount = 0 });

            // Determine whether the caller is an organization admin
            var isOrgAdmin = User.IsInRole("Organization Admin") || User.IsInRole("Application Admin");

            // Resolve the store ID based on the user's role
            int? resolvedStoreId = null;
            if (!isOrgAdmin)
            {
                if (!domainUser.StoreId.HasValue) return Ok(new { items = Array.Empty<InventoryTransferListDto>(), totalCount = 0 });
                resolvedStoreId = domainUser.StoreId.Value;
            }
            else if (storeId.HasValue)
            {
                resolvedStoreId = storeId.Value;
            }

            try
            {
                // Fetch the paged transfers
                var orgId = domainUser.OrgId;
                var (items, totalCount) = await _repository.GetPagedForCurrentStoreAsync(resolvedStoreId, isOrgAdmin, orgId, flow, status, page, pageSize);

                // Return the result
                return Ok(new { items, totalCount });
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load inventory transfers");
                return StatusCode(500, "Failed to load inventory transfers");
            }
        }

        // GET api/inventorytransfers/statuses
        // Retrieves distinct transfer statuses for populating client-side filters.
        [HttpGet("statuses")]
        public async Task<ActionResult<IEnumerable<string>>> GetStatuses()
        {
            try
            {
                // Fetch the statuses
                var statuses = await _repository.GetStatusesAsync();

                // Return the result
                return Ok(statuses);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load transfer statuses");
                return StatusCode(500, "Failed to load transfer statuses");
            }
        }

        // GET api/inventorytransfers/{id}
        // Retrieves detailed information about a specific inventory transfer.
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            try
            {
                //resolve user ID
                var userId = await ResolveUserIdAsync();

                if (!userId.HasValue)
                    return Unauthorized();
                else
                {

                    // Fetch the transfer details
                    var dto = await _repository.GetDetailByIdAsync(id, userId.Value);
                    if (dto == null) return NotFound();

                    // Return the result
                    return Ok(dto);
                }
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load inventory transfer {Id}", id);
                return StatusCode(500, "Failed to load inventory transfer");
            }
        }

        // POST api/inventorytransfers
        // Creates a new inventory transfer request.
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> CreateTransfer()
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null || !domainUser.StoreId.HasValue) return BadRequest("Unable to resolve user's store.");

            // Deserialize the request body
            var opts = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            CreateInventoryTransferDto? dto;
            try
            {
                using var sr = new System.IO.StreamReader(Request.Body);
                var body = await sr.ReadToEndAsync();
                dto = System.Text.Json.JsonSerializer.Deserialize<CreateInventoryTransferDto>(body, opts);
            }
            catch
            {
                return BadRequest("Invalid request body.");
            }

            // Validate the DTO
            if (dto == null) return BadRequest("Missing payload.");

            // Fetch the transfer status
            var statusValue = !string.IsNullOrWhiteSpace(dto.Status) ? dto.Status!.Trim() : "draft";

            //if draft allow empty items
            if (statusValue != "draft") { 
                if (dto.Items == null || dto.Items.Length == 0) return BadRequest("Select at least one item.");
            }


            // Resolve the requester and source store IDs
            var requesterId = dto.RequesterStoreId ?? domainUser.StoreId!.Value;
            var fromId = dto.FromStoreId;
            if (!fromId.HasValue) return BadRequest("Request From store must be selected.");

            // Parse the requested date
            var parsedDate = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(dto.Date) && DateTime.TryParse(dto.Date, out var d)) parsedDate = d;

            
            var status = await _repository.GetTransferStatusByNameAsync(statusValue.ToLowerInvariant());

            await SetAuditContextUserId();

            try
            {
                // Create the transfer object
                var transfer = new InventoryTransfer
                {
                    FromStore = fromId.Value,
                    ToStore = requesterId,
                    RequestedAt = parsedDate,
                    InventoryTransferStatusId = status?.TransferStatusId ?? 1,
                    Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim(),
                    RequestedBy = domainUser.UserId
                };

                // Add the transfer
                var createdTransfer = await _repository.AddTransferAsync(transfer);

                // Add transfer items
                foreach (var it in dto.Items)
                {
                    var qty = it.Quantity;
                    if (qty <= 0)
                    {
                        _logger.LogWarning("Skipping transfer item with non-positive quantity: {Item}", it);
                        continue;
                    }

                    if (it.RecipeId.HasValue)
                    {
                        var transferItem = new TransferItem
                        {
                            InventoryTransferId = createdTransfer.InventoryTransferId,
                            RecipeId = it.RecipeId,
                            Quantity = qty,
                            IsRequested = true
                        };
                        await _repository.AddTransferItemAsync(transferItem);
                    }
                    else if (it.InventoryItemId.HasValue)
                    {
                        var transferItem = new TransferItem
                        {
                            InventoryTransferId = createdTransfer.InventoryTransferId,
                            InventoryItemId = it.InventoryItemId,
                            Quantity = qty,
                            IsRequested = true
                        };
                        await _repository.AddTransferItemAsync(transferItem);
                    }
                    else
                    {
                        _logger.LogWarning("Skipping invalid transfer item (no ids): {Item}", it);
                    }
                }

                // Return the created transfer
                return CreatedAtAction(nameof(GetById), new { id = createdTransfer.InventoryTransferId }, new { id = createdTransfer.InventoryTransferId });
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to create inventory transfer");
                return StatusCode(500, "Failed to create inventory transfer.");
            }
        }

        // PUT api/inventorytransfers/{id}/items
        // Replaces all transfer items for a given transfer with the provided selection.
        [Authorize]
        [HttpPut("{id:int}/items")]
        public async Task<ActionResult> UpdateTransferItems(int id, [FromBody] CreateInventoryTransferItemDto[] items)
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user using the repository
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate transfer exists and user has access
            var transfer = await _repository.GetTransferWithStoresAsync(id);
            if (transfer == null) return NotFound();

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Check if the user is an organization admin or has access to the transfer
            var isOrgAdmin = User.IsInRole("Organization Admin") || User.IsInRole("Application Admin");
            if (!isOrgAdmin && domainUser.StoreId.HasValue)
            {
                var sId = domainUser.StoreId.Value;
                if (transfer.FromStore != sId && transfer.ToStore != sId)
                    return Forbid();
            }

            try
            {
                // Delegate the update logic to the repository
                await _repository.UpdateTransferItemsAsync(id, items ?? Array.Empty<CreateInventoryTransferItemDto>());
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                // Log the database error and return a 500 status code
                _logger.LogError(ex, "DB error updating transfer items for transfer {Id}", id);
                return StatusCode(500, "Failed to update transfer items.");
            }
            catch (Exception ex)
            {
                // Log the general error and return a 500 status code
                _logger.LogError(ex, "Failed to update transfer items for transfer {Id}", id);
                return StatusCode(500, "Failed to update transfer items.");
            }
        }

        // PUT api/inventorytransfers/{id}
        // Updates metadata and items for a specific inventory transfer.
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdateTransfer(int id, [FromBody] CreateInventoryTransferDto dto)
        {
            // Validate the payload and transfer ID
            if (dto == null) return BadRequest("Invalid payload.");
            if (id <= 0) return BadRequest("Invalid transfer id.");

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user using the repository
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate transfer exists and user has access
            var transfer = await _repository.GetTransferWithStoresAsync(id);
            if (transfer == null) return NotFound();

            // Check if the user is an organization admin or has access to the transfer
            var isOrgAdmin = User.IsInRole("Organization Admin") || User.IsInRole("Application Admin");
            if (!isOrgAdmin && domainUser.StoreId.HasValue)
            {
                var sId = domainUser.StoreId.Value;
                if (transfer.FromStore != sId && transfer.ToStore != sId)
                    return Forbid();
            }

            // Set the audit context user ID
            await SetAuditContextUserId();

            try
            {
                // Update metadata (status, notes, date, stores) using the repository
                await _repository.UpdateTransferAsync(id, dto);

                // If items are present in the DTO, replace items as well using the repository
                if (dto.Items != null && dto.Items.Length > 0)
                {
                    await _repository.UpdateTransferItemsAsync(id, dto.Items);
                }

                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                // Return a 404 status code if the transfer is not found
                return NotFound();
            }
            catch (DbUpdateException ex)
            {
                // Log the database error and return a 500 status code
                _logger.LogError(ex, "DB error updating transfer {Id}", id);
                return StatusCode(500, "Failed to update transfer.");
            }
            catch (Exception ex)
            {
                // Log the general error and return a 500 status code
                _logger.LogError(ex, "Failed to update transfer {Id}", id);
                return StatusCode(500, "Failed to update transfer.");
            }
        }

        // POST api/inventorytransfers/{id}/approve
        // Approves a specific inventory transfer and assigns a driver if provided.
        [Authorize]
        [HttpPost("{id:int}/approve")]
        public async Task<ActionResult> Approve(int id, [FromBody] ApproveTransferDto dto)
        {
            // Validate the transfer ID and payload
            if (id <= 0) return BadRequest("Invalid transfer id.");
            if (dto == null) return BadRequest("Invalid payload.");

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user using the repository
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate transfer exists and user has access
            var transfer = await _repository.GetTransferWithStoresAsync(id);
            if (transfer == null) return NotFound();

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Check if the user is an organization admin or has access to the transfer
            var isOrgAdmin = User.IsInRole("Organization Admin");
            if (!isOrgAdmin && domainUser.StoreId.HasValue)
            {
                var sId = domainUser.StoreId.Value;
                if (transfer.FromStore != sId && transfer.ToStore != sId) return Forbid();
            }

            try
            {
                // Delegate the approval logic to the repository
                var items = dto.Items ?? Array.Empty<CreateInventoryTransferItemDto>();
                await _repository.ApproveTransferAsync(
                    id,
                    dto.DriverId,
                    dto.NewDriverName,
                    dto.NewDriverEmail,
                    items,
                    dto.Notes,
                    domainUser.UserId
                );

                return NoContent();
            }
            catch (KeyNotFoundException knf)
            {
                // Log the error and return a 404 status code
                _logger.LogWarning(knf, "Approve failed for transfer {Id}", id);
                return NotFound(knf.Message);
            }
            catch (DbUpdateException dbEx)
            {
                // Log the database error and return a 500 status code
                _logger.LogError(dbEx, "DB error approving transfer {Id}", id);
                return StatusCode(500, "Failed to approve transfer.");
            }
            catch (Exception ex)
            {
                // Log the general error and return a 500 status code
                _logger.LogError(ex, "Failed to approve transfer {Id}", id);
                return StatusCode(500, "Failed to approve transfer.");
            }
        }

        // POST api/inventorytransfers/{id}/reject
        // Rejects a specific inventory transfer and updates its status and notes.
        [Authorize]
        [HttpPost("{id:int}/reject")]
        public async Task<ActionResult> Reject(int id, [FromBody] RejectTransferDto? dto)
        {
            // Validate the transfer ID
            if (id <= 0) return BadRequest("Invalid transfer id.");

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user using the repository
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate transfer exists and user has access
            var transfer = await _repository.GetTransferWithStoresAsync(id);
            if (transfer == null) return NotFound();

            // Check if the user is an organization admin or has access to the transfer
            var isOrgAdmin = User.IsInRole("Organization Admin");
            if (!isOrgAdmin && domainUser.StoreId.HasValue)
            {
                var sId = domainUser.StoreId.Value;
                if (transfer.FromStore != sId && transfer.ToStore != sId) return Forbid();
            }

            try
            {
                // Delegate the rejection logic to the repository
                await _repository.RejectTransferAsync(id, dto?.Notes);
                return NoContent();
            }
            catch (KeyNotFoundException knf)
            {
                // Log the error and return a 404 status code
                _logger.LogWarning(knf, "Reject failed for transfer {Id}", id);
                return NotFound(knf.Message);
            }
            catch (DbUpdateException dbEx)
            {
                // Log the database error and return a 500 status code
                _logger.LogError(dbEx, "DB error rejecting transfer {Id}", id);
                return StatusCode(500, "Failed to reject transfer.");
            }
            catch (Exception ex)
            {
                // Log the general error and return a 500 status code
                _logger.LogError(ex, "Failed to reject transfer {Id}", id);
                return StatusCode(500, "Failed to reject transfer.");
            }
        }


        // POST api/inventorytransfers/{id}/deliver
        // Sets the transfer status to "delivered" and processes the transfer items.
        [Authorize]
        [HttpPost("{id:int}/deliver")]
        public async Task<ActionResult> DeliverTransfer(int id)
         {
            // Validate the transfer ID
            if (id <= 0) return BadRequest("Invalid transfer ID.");

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch the domain user using the repository
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate transfer exists and user has access
            var transfer = await _repository.GetTransferWithStoresAsync(id);
            if (transfer == null) return NotFound();

            // Check if the user is an organization admin or has access to the transfer
            var isOrgAdmin = User.IsInRole("Organization Admin");
            if (!isOrgAdmin && domainUser.StoreId.HasValue)
            {
                var sId = domainUser.StoreId.Value;
                if (transfer.FromStore != sId && transfer.ToStore != sId) return Forbid();
            }

            try
            {
                // Call the repository method to set the transfer to "delivered"
                await _repository.SetTransferToDeliveredAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException knf)
            {
                // Log the error and return a 404 status code
                _logger.LogWarning(knf, "Deliver failed for transfer {Id}", id);
                return NotFound(knf.Message);
            }
            catch (InvalidOperationException ioe)
            {
                // Log the error and return a 400 status code
                _logger.LogWarning(ioe, "Deliver failed for transfer {Id}", id);
                return BadRequest(ioe.Message);
            }
            catch (DbUpdateException dbEx)
            {
                // Log the database error and return a 500 status code
                _logger.LogError(dbEx, "DB error delivering transfer {Id}", id);
                return StatusCode(500, "Failed to deliver transfer.");
            }
            catch (Exception ex)
            {
                // Log the general error and return a 500 status code
                _logger.LogError(ex, "Failed to deliver transfer {Id}", id);
                return StatusCode(500, "Failed to deliver transfer.");
            }
        }

        // GET api/inventorytransfers/latest-for-organization
        // Retrieves the latest updated inventory transfers for a given organization.
        [HttpGet("latest-for-organization")]
        public async Task<ActionResult<IEnumerable<InventoryTransferOverviewDto>>> GetLatestForOrganization([FromQuery] int organizationId, [FromQuery] int maxCount = 6)
        {
            try
            {
                // Fetch the latest transfers for the organization
                var transfers = await _repository.GetLatestForOrganizationAsync(organizationId, maxCount);

                // Return the result
                return Ok(transfers);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load latest inventory transfers for organization {OrganizationId}", organizationId);
                return StatusCode(500, "Failed to load latest inventory transfers for organization");
            }
        }


        // Resolves the user ID from the current user's claims.
        private async Task<int?> ResolveUserIdAsync()
        {
            // Extract the email from the user's claims or identity
            var email = User?.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User?.Identity?.Name;

            // Return null if the email is missing or invalid
            if (string.IsNullOrWhiteSpace(email)) return null;

            // Fetch the user from the repository using the email
            var user = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

            // Return the user ID if the user exists, otherwise return null
            return user?.UserId;
        }

        // Sets the audit context user ID based on the current user's claims.
        private async Task SetAuditContextUserId()
        {
            // Resolve the user ID and set it in the audit context
            _auditContext.UserId = await ResolveUserIdAsync();
        }



    }
}