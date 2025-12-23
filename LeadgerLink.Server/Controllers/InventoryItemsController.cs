using DocumentFormat.OpenXml.Spreadsheet;
using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Dtos.InventoryItemDtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/inventoryitems")]
    public class InventoryItemsController : ControllerBase
    {
        // Database context for direct database operations
        private readonly LedgerLinkDbContext _context;

        // Repository for inventory item operations
        private readonly IInventoryItemRepository _inventoryRepo;

        // Repository for supplier operations
        private readonly IRepository<Supplier> _supplierRepo;

        // Repository for product operations
        private readonly IProductRepository _productRepo;

        // Logger for logging messages and errors
        private readonly ILogger<InventoryItemsController> _logger;

        // Logger for audit-related operations
        private readonly IAuditLogger _auditLogger;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Repository for user-specific queries
        private readonly IUserRepository _userRepository;

        // Repository for VAT category operations
        private readonly IRepository<VatCategory> _vatCategoryRepo;

        // Repository for store-specific queries
        private readonly IStoreRepository _storeRepository;

        // Constructor to initialize dependencies
        public InventoryItemsController(
            LedgerLinkDbContext context,
            IInventoryItemRepository inventoryRepo,
            IRepository<Supplier> supplierRepo,
            IProductRepository productRepo,
            ILogger<InventoryItemsController> logger,
            IAuditLogger auditLogger,
            IAuditContext auditContext,
            IUserRepository userRepository,
            IRepository<VatCategory> vatCategoryRepo,
            IStoreRepository storeRepository)
        {
            _context = context;
            _inventoryRepo = inventoryRepo;
            _supplierRepo = supplierRepo;
            _productRepo = productRepo;
            _logger = logger;
            _auditLogger = auditLogger;
            _auditContext = auditContext;
            _userRepository = userRepository;
            _vatCategoryRepo = vatCategoryRepo;

            // Set audit level to organization level for all actions
            _auditContext.AuditLevel = 2;
            _auditContext.IsAuditEnabled = true;
            _storeRepository = storeRepository;
        }

        // GET api/inventoryitems/lookups
        // Fetches lookup data for inventory items, including units and VAT categories.
        [HttpGet("lookups")]
        public async Task<ActionResult> GetLookups()
        {
            try
            {
                // Fetch lookup data
                var (units, vatCategories) = await _inventoryRepo.GetLookupsAsync();

                // Return lookup data
                return Ok(new { units, vatCategories });
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                await _auditLogger.LogExceptionAsync("Failed to load lookups", ex.StackTrace);
                return StatusCode(500, "Failed to load lookups");
            }
        }

        // GET api/inventoryitems/list-for-current-store
        // Retrieves a paginated list of inventory items for the current user's store.
        [Authorize]
        [HttpGet("list-for-current-store")]
        public async Task<ActionResult> ListForCurrentStore(
            [FromQuery] string? stockLevel = null,
            [FromQuery] int? supplierId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] int? storeId = null)
        {
            try
            {
                // Validate user authentication
                if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

                // Resolve user ID
                var userId = await ResolveUserIdAsync();
                if (!userId.HasValue) return Unauthorized();

                // Fetch domain user
                var domainUser = await _userRepository.GetByIdAsync(userId.Value);
                if (domainUser == null) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });

                // Validate user's organization association
                if (!domainUser.OrgId.HasValue) return BadRequest("Unable to resolve user's organization.");

                // Determine store ID
                var isOrgAdmin = User.IsInRole("Organization Admin");
                int? resolvedStoreId = null;
                if (!isOrgAdmin)
                {
                    if (!domainUser.StoreId.HasValue) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });
                    resolvedStoreId = domainUser.StoreId.Value;
                }
                else
                {
                    resolvedStoreId = storeId ?? domainUser.StoreId;
                    if (!resolvedStoreId.HasValue) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });

                    // Validate store organization ID
                    var storeOrgId = await _storeRepository.GetOrganizationIdByStoreIdAsync(resolvedStoreId.Value);
                    if (!storeOrgId.HasValue || storeOrgId.Value != domainUser.OrgId.Value)
                    {
                        return Forbid("The store does not belong to the same organization as the user.");
                    }
                }

                // Normalize stock level
                string? normalizedStockLevel = !string.IsNullOrWhiteSpace(stockLevel)
                    ? stockLevel.Trim().ToLowerInvariant()
                    : null;

                // Fetch inventory items
                var (items, totalCount) = await _inventoryRepo.GetPagedForStoreAsync(
                    resolvedStoreId.Value,
                    normalizedStockLevel ?? string.Empty,
                    supplierId,
                    categoryId,
                    Math.Max(1, page),
                    Math.Clamp(pageSize, 1, 200)
                );

                // Fetch suppliers and categories for the store
                var suppliers = await _inventoryRepo.GetSuppliersForStoreAsync(resolvedStoreId.Value);
                var categories = await _inventoryRepo.GetCategoriesForStoreAsync(resolvedStoreId.Value);

                // Return inventory items, suppliers, and categories
                return Ok(new { items, totalCount, suppliers, categories });
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                try { await _auditLogger.LogExceptionAsync("Failed to load inventory items for store", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to load inventory items");
            }
        }

        // POST api/inventoryitems
        // Creates a new inventory item.
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> CreateInventoryItem()
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Set audit context user ID
            await SetAuditContextUserId();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch domain user
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            CreateInventoryItemDto dto;

            // Deserialize payload
            if (Request.HasFormContentType)
            {
                var payload = Request.Form["payload"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(payload))
                {
                    var jsonFile = Request.Form.Files.FirstOrDefault(f => string.Equals(f.Name, "payload", StringComparison.OrdinalIgnoreCase)
                                                                          || string.Equals(f.FileName, "payload.json", StringComparison.OrdinalIgnoreCase)
                                                                          || (f.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) ?? false));
                    if (jsonFile != null)
                    {
                        using var sr = new StreamReader(jsonFile.OpenReadStream());
                        payload = await sr.ReadToEndAsync();
                    }
                }

                if (string.IsNullOrWhiteSpace(payload))
                    return BadRequest("Missing payload in form data.");
                try
                {
                    dto = JsonSerializer.Deserialize<CreateInventoryItemDto>(payload, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Invalid payload JSON");
                    return BadRequest("Invalid payload JSON.");
                }
            }
            else
            {
                try
                {
                    using var sr = new StreamReader(Request.Body);
                    var body = await sr.ReadToEndAsync();
                    dto = JsonSerializer.Deserialize<CreateInventoryItemDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Invalid request body");
                    return BadRequest("Invalid request body.");
                }
            }

            // Validate input
            if (string.IsNullOrWhiteSpace(dto?.inventoryItemName) || dto.inventoryItemName.Trim().Length < 3)
                return BadRequest("Item name must be at least 3 characters.");
            if (dto.shortDescription != null && dto.shortDescription.Trim().Length > 0 && dto.shortDescription.Trim().Length < 3)
                return BadRequest("Short description must be at least 3 characters when provided.");
            if (dto.productDescription != null && dto.productDescription.Trim().Length > 0 && dto.productDescription.Trim().Length < 3)
                return BadRequest("Product description must be at least 3 characters when provided.");
            if (!dto.supplierId.HasValue && (dto.newSupplier == null || string.IsNullOrWhiteSpace(dto.newSupplier.name) || string.IsNullOrWhiteSpace(dto.newSupplier.contactMethod) || dto.newSupplier.name.Trim().Length < 3 || dto.newSupplier.contactMethod.Trim().Length < 3))
                return BadRequest("Provide existing supplierId or a valid newSupplier (name and contactMethod, each >= 3 chars).");
            if (dto.quantity.HasValue && dto.quantity.Value < 0) return BadRequest("Quantity cannot be negative.");
            if (dto.costPerUnit.HasValue && dto.costPerUnit.Value < 0) return BadRequest("Cost per unit cannot be negative.");
            if (dto.minimumQuantity.HasValue && dto.minimumQuantity.Value < 0) return BadRequest("Minimum quantity cannot be negative.");
            if (dto.isOnSale)
            {
                if (!dto.sellingPrice.HasValue) return BadRequest("Selling price must be provided when item is set on sale.");
                if (dto.sellingPrice.Value < 0) return BadRequest("Selling price cannot be negative.");
                if (!dto.vatCategoryId.HasValue) return BadRequest("VAT category must be selected when item is set on sale.");
            }

            // Resolve store ID
            int? resolvedStoreId = dto.storeId.HasValue && dto.storeId.Value > 0
                ? dto.storeId
                : domainUser.StoreId;

            if (!resolvedStoreId.HasValue)
                return BadRequest("Unable to resolve store for inventory item.");

            try
            {
                // Begin transaction
                await using var tx = await _context.Database.BeginTransactionAsync();

                int? resolvedSupplierId = dto.supplierId;

                // Create new supplier if required
                if (!resolvedSupplierId.HasValue && dto.newSupplier != null)
                {
                    var supplier = new Supplier
                    {
                        SupplierName = dto.newSupplier.name!.Trim(),
                        ContactMethod = dto.newSupplier.contactMethod!.Trim(),
                        StoreId = resolvedStoreId
                    };

                    var addedSupplier = await _supplierRepo.AddAsync(supplier);
                    resolvedSupplierId = addedSupplier.SupplierId;
                }

                // Build inventory item
                var item = new InventoryItem
                {
                    InventoryItemName = dto.inventoryItemName!.Trim(),
                    Description = string.IsNullOrWhiteSpace(dto.shortDescription) ? null : dto.shortDescription!.Trim(),
                    InventoryItemCategoryId = dto.inventoryItemCategoryId,
                    UnitId = dto.unitId ?? 0,
                    Quantity = dto.quantity ?? 0m,
                    CostPerUnit = dto.costPerUnit ?? 0m,
                    MinimumQuantity = dto.minimumQuantity,
                    StoreId = resolvedStoreId.Value,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    SupplierId = resolvedSupplierId,
                    UserId = domainUser.UserId
                };

                // Check for duplicates
                var existingItem = await _inventoryRepo.GetFirstOrDefaultAsync(i =>
                    i.InventoryItemName == dto.inventoryItemName.Trim() &&
                    i.Description == (string.IsNullOrWhiteSpace(dto.shortDescription) ? null : dto.shortDescription.Trim()) &&
                    i.InventoryItemCategoryId == dto.inventoryItemCategoryId &&
                    i.UnitId == (dto.unitId ?? 0) &&
                    i.Quantity == (dto.quantity ?? 0m) &&
                    i.CostPerUnit == (dto.costPerUnit ?? 0m) &&
                    i.MinimumQuantity == dto.minimumQuantity &&
                    i.StoreId == resolvedStoreId.Value &&
                    i.SupplierId == resolvedSupplierId
                );

                if (existingItem != null)
                {
                    return Conflict("An inventory item with the same details already exists.");
                }

                // Handle image if present
                if (Request.HasFormContentType && Request.Form.Files.Count > 0)
                {
                    var imageFile = Request.Form.Files
                        .FirstOrDefault(f => string.Equals(f.Name, "image", StringComparison.OrdinalIgnoreCase)
                                             || (f.ContentType != null && f.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)));

                    if (imageFile != null && imageFile.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        await imageFile.CopyToAsync(ms);
                        item.InventoryItemImage = ms.ToArray();
                    }
                }

                var addedItem = await _inventoryRepo.AddAsync(item);

                // If the frontend requested to put the item on sale, create a Product linked to this inventory item.
                if (dto.isOnSale)
                {
                    var finalCost = dto.costPrice ?? item.CostPerUnit;
                    decimal finalSelling = dto.sellingPrice ?? finalCost;
                    if (!dto.sellingPrice.HasValue && dto.vatCategoryId.HasValue)
                    {
                        var vatEntity = await _vatCategoryRepo.GetByIdAsync(dto.vatCategoryId.Value);
                        if (vatEntity != null)
                        {
                            var rate = vatEntity.VatRate; // percent
                            finalSelling = finalCost + (finalCost * (rate / 100m));
                        }
                    }

                    var product = new Product
                    {
                        ProductName = item.InventoryItemName,
                        SellingPrice = finalSelling,
                        CostPrice = finalCost,
                        StoreId = item.StoreId,
                        IsRecipe = false,
                        RecipeId = null,
                        InventoryItemId = addedItem.InventoryItemId,
                        VatCategoryId = dto.vatCategoryId!.Value,
                        Description = string.IsNullOrWhiteSpace(dto.productDescription) ? item.Description : dto.productDescription!.Trim()
                    };

                    await _productRepo.AddAsync(product);
                }

                await tx.CommitAsync();

                // Return created inventory item
                return CreatedAtAction(nameof(GetById), new { id = addedItem.InventoryItemId }, addedItem);
            }
            catch (DbUpdateException dbEx)
            {
                // Rollback transaction and log error
                _logger.LogError(dbEx, "Database error saving inventory item");
                await _auditLogger.LogExceptionAsync("Database error saving inventory item", dbEx.StackTrace);
                return StatusCode(500, "Failed to save inventory item.");
            }
            catch (Exception ex)
            {
                // Rollback transaction and log error
                _logger.LogError(ex, "Failed to create inventory item");
                try {await _auditLogger.LogExceptionAsync("Failed to create inventory item", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to create inventory item.");
            }
        }

        // GET api/inventoryitems/{id}
        // Retrieves an inventory item by its ID.
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

                    //cast to int
                    int userIdValue = userId.Value;

                    // Fetch inventory item details
                    var dto = await _inventoryRepo.GetDetailByIdAsync(id, userIdValue);
                    if (dto == null) return NotFound();

                    // Return inventory item details
                    return Ok(dto);

                }



            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                _logger.LogError(ex, "Failed to retrieve inventory item with ID {Id}", id);
                try {await _auditLogger.LogExceptionAsync("Failed to retrieve inventory item", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to retrieve inventory item.");
            }


        }

        // GET api/inventoryitems/{id}/image
        // Retrieves the image for an inventory item by its ID.
        [HttpGet("{id:int}/image")]
        public async Task<IActionResult> GetImage(int id)
        {
            try
            {
                // Fetch inventory item with image
                var item = await _inventoryRepo.GetWithRelationsAsync(id);
                if (item == null || item.InventoryItemImage == null || item.InventoryItemImage.Length == 0)
                {
                    return NotFound();
                }

                // Return image as JPEG
                return File(item.InventoryItemImage, "image/jpeg");
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                _logger.LogError(ex, "Failed to retrieve image for inventory item with ID {Id}", id);
                try { await _auditLogger.LogExceptionAsync("Failed to retrieve inventory item image", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to retrieve image.");
            }
        }


        // PUT api/inventoryitems/{id}
        // Updates an existing inventory item by its ID.
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdateInventoryItem(int id, [FromQuery] int? storeId = null)
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Resolve user ID
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();

            // Fetch domain user
            var domainUser = await _userRepository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            // Validate user's organization association
            if (!domainUser.OrgId.HasValue) return BadRequest("Unable to resolve user's organization.");

            // Check if the user is an Organization Admin
            var isOrgAdmin = User.IsInRole("Organization Admin");

            // If storeId is provided, validate it
            if (storeId.HasValue)
            {
                if (!isOrgAdmin)
                {
                    return Forbid("Only Organization Admins can set the store ID.");
                }

                // Fetch the store and validate organization ID
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId.Value);
                if (store == null)
                {
                    return BadRequest("Invalid store ID.");
                }

                if (store.OrgId != domainUser.OrgId)
                {
                    return Forbid("The store does not belong to the same organization as the user.");
                }
            }
            else
            {
                // Default to the user's store ID if not provided
                storeId = domainUser.StoreId;
                if (!storeId.HasValue)
                {
                    return BadRequest("Unable to resolve store for the user.");
                }
            }

            // Fetch the existing inventory item
            var existing = await _inventoryRepo.GetByIdAsync(id);
            if (existing == null) return NotFound();

            // Deserialize the payload
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            string? payloadStr = null;
            if (Request.HasFormContentType)
            {
                payloadStr = Request.Form["payload"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(payloadStr))
                {
                    var jsonFile = Request.Form.Files.FirstOrDefault(f => string.Equals(f.Name, "payload", StringComparison.OrdinalIgnoreCase)
                                                                  || string.Equals(f.FileName, "payload.json", StringComparison.OrdinalIgnoreCase)
                                                                  || (f.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) ?? false));
                    if (jsonFile != null)
                    {
                        using var sr = new StreamReader(jsonFile.OpenReadStream());
                        payloadStr = await sr.ReadToEndAsync();
                    }
                }
            }
            else
            {
                using var sr = new StreamReader(Request.Body);
                payloadStr = await sr.ReadToEndAsync();
            }

            // Validate payload
            if (string.IsNullOrWhiteSpace(payloadStr)) return BadRequest("Missing payload.");

            // Deserialize the payload into DTO
            var dto = JsonSerializer.Deserialize<EditInventoryItemDto>(payloadStr!, opts);
            if (dto == null) return BadRequest("Invalid payload JSON.");

            // Validate input fields
            if (string.IsNullOrWhiteSpace(dto.inventoryItemName) || dto.inventoryItemName.Trim().Length < 3)
                return BadRequest("Item name must be at least 3 characters.");
            if (dto.shortDescription != null && dto.shortDescription.Trim().Length > 0 && dto.shortDescription.Trim().Length < 3)
                return BadRequest("Short description must be at least 3 characters when provided.");
            if (dto.quantity.HasValue && dto.quantity.Value < 0) return BadRequest("Quantity cannot be negative.");
            if (dto.costPerUnit.HasValue && dto.costPerUnit.Value < 0) return BadRequest("Cost per unit cannot be negative.");
            if (dto.minimumQuantity.HasValue && dto.minimumQuantity.Value < 0) return BadRequest("Minimum quantity cannot be negative.");
            if (dto.isOnSale)
            {
                if (!dto.sellingPrice.HasValue) return BadRequest("Selling price must be provided when item is set on sale.");
                if (dto.sellingPrice.Value < 0) return BadRequest("Selling price cannot be negative.");
                if (!dto.vatCategoryId.HasValue) return BadRequest("VAT category must be selected when item is set on sale.");
            }

            // Begin transaction for updating the inventory item
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Update scalar fields of the inventory item
                existing.InventoryItemName = dto.inventoryItemName!.Trim();
                existing.Description = string.IsNullOrWhiteSpace(dto.shortDescription) ? null : dto.shortDescription!.Trim();
                existing.InventoryItemCategoryId = dto.inventoryItemCategoryId;
                existing.UnitId = dto.unitId ?? existing.UnitId;
                existing.Quantity = dto.quantity ?? existing.Quantity;
                existing.CostPerUnit = dto.costPerUnit ?? existing.CostPerUnit;
                existing.MinimumQuantity = dto.minimumQuantity;
                existing.UpdatedAt = DateTime.Now;
                existing.StoreId = storeId.Value; // Update the store ID

                // Assign supplier if provided
                if (dto.supplierId.HasValue)
                {
                    existing.SupplierId = dto.supplierId.Value;
                }

                // Update supplier details if provided
                if (existing.SupplierId.HasValue && dto.editSupplier != null)
                {
                    var supplier = await _supplierRepo.GetByIdAsync(existing.SupplierId.Value);
                    if (supplier != null)
                    {
                        if (!string.IsNullOrWhiteSpace(dto.editSupplier.name)) supplier.SupplierName = dto.editSupplier.name!.Trim();
                        if (!string.IsNullOrWhiteSpace(dto.editSupplier.contactMethod)) supplier.ContactMethod = dto.editSupplier.contactMethod!.Trim();
                        await _supplierRepo.UpdateAsync(supplier);
                    }
                }

                // Replace image if a new image file is provided
                if (Request.HasFormContentType && Request.Form.Files.Count > 0)
                {
                    var imageFile = Request.Form.Files.FirstOrDefault(f => string.Equals(f.Name, "image", StringComparison.OrdinalIgnoreCase)
                                                                   || (f.ContentType != null && f.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)));
                    if (imageFile != null && imageFile.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        await imageFile.CopyToAsync(ms);
                        existing.InventoryItemImage = ms.ToArray();
                    }
                }

                // Update the inventory item in the repository
                await _inventoryRepo.UpdateAsync(existing);

                // Handle product on sale: create or update linked product
                var existingProduct = await _productRepo.GetByIdAsync(existing.InventoryItemId);
                if (dto.isOnSale)
                {
                    if (existingProduct == null)
                    {
                        var finalCost = dto.costPrice ?? existing.CostPerUnit;
                        decimal finalSelling = dto.sellingPrice ?? finalCost;
                        if (!dto.sellingPrice.HasValue && dto.vatCategoryId.HasValue)
                        {
                            var vatEntity = await _vatCategoryRepo.GetByIdAsync(dto.vatCategoryId.Value);
                            if (vatEntity != null)
                            {
                                var rate = vatEntity.VatRate;
                                finalSelling = finalCost + (finalCost * (rate / 100m));
                            }
                        }

                        var product = new Product
                        {
                            ProductName = existing.InventoryItemName,
                            SellingPrice = finalSelling,
                            CostPrice = finalCost,
                            StoreId = existing.StoreId,
                            IsRecipe = false,
                            RecipeId = null,
                            InventoryItemId = existing.InventoryItemId,
                            VatCategoryId = dto.vatCategoryId!.Value,
                            Description = string.IsNullOrWhiteSpace(dto.productDescription) ? existing.Description : dto.productDescription!.Trim()
                        };
                        await _productRepo.AddAsync(product);
                    }
                    else
                    {
                        existingProduct.ProductName = existing.InventoryItemName;
                        existingProduct.SellingPrice = dto.sellingPrice ?? existingProduct.SellingPrice;
                        existingProduct.CostPrice = dto.costPrice ?? existing.CostPerUnit;
                        existingProduct.VatCategoryId = dto.vatCategoryId!.Value;
                        existingProduct.Description = string.IsNullOrWhiteSpace(dto.productDescription) ? existing.Description : dto.productDescription!.Trim();
                        await _productRepo.UpdateAsync(existingProduct);
                    }
                }

                // Commit the transaction
                await tx.CommitAsync();
                return NoContent();
            }
            catch (DbUpdateException dbEx)
            {
                // Rollback transaction and log error
                await tx.RollbackAsync();
                _logger.LogError(dbEx, "Database error updating inventory item");
                try {await _auditLogger.LogExceptionAsync("Database error updating inventory item", dbEx.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to update inventory item.");
            }
            catch (Exception ex)
            {
                // Rollback transaction and log error
                await tx.RollbackAsync();
                _logger.LogError(ex, "Failed to update inventory item");
                try {await _auditLogger.LogExceptionAsync("Failed to update inventory item", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to update inventory item.");
            }
        }

        // POST api/inventoryitems/{id}/restock
        [Authorize]
        [HttpPost("{id:int}/restock")]
        public async Task<ActionResult> RestockQuantity(int id, [FromBody] RestockDto dto)
        {
            // Set the audit context user ID at the beginning of the method
            await SetAuditContextUserId();

            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            if (dto == null) return BadRequest("Missing payload.");
            if (dto.AddedQuantity <= 0) return BadRequest("Added quantity must be greater than zero.");

            try
            {
                // Fetch the inventory item using the repository
                var item = await _inventoryRepo.GetByIdAsync(id);
                if (item == null) return NotFound();

                // Update the quantity
                item.Quantity += dto.AddedQuantity;
                item.UpdatedAt = DateTime.Now;

                // Use the repository to update the inventory item
                await _inventoryRepo.UpdateAsync(item);

                return Ok(new { inventoryItemId = id, quantity = item.Quantity });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to restock inventory item with ID {Id}", id);
                try {await _auditLogger.LogExceptionAsync("Failed to restock inventory item", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to restock inventory item.");
            }
        }

        // DTO for restocking inventory items
        public class RestockDto
        {
            // Quantity to be added to the inventory item
            public decimal AddedQuantity { get; set; }
        }

        // GET api/inventoryitems/list-for-organization
        // Retrieves a paginated list of inventory items for an organization.
        [Authorize(Roles = "Organization Admin")]
        [HttpGet("list-for-organization")]
        public async Task<ActionResult> ListForOrganization(
            [FromQuery] int? organizationId = null,
            [FromQuery] string? stockLevel = null,
            [FromQuery] int? supplierId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            // Validate user authentication
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            // Determine organizationId: if not provided, try to infer from user
            int? orgId = organizationId;
            if (!orgId.HasValue)
            {
                // Resolve user ID
                var userId = await ResolveUserIdAsync();
                if (!userId.HasValue) return Unauthorized();

                // Fetch domain user
                var domainUser = await _userRepository.GetByIdAsync(userId.Value);
                if (domainUser == null) return Unauthorized();

                // Validate user's organization association
                if (!domainUser.OrgId.HasValue)
                    return BadRequest("Unable to resolve organization.");
                orgId = domainUser.OrgId.Value;
            }

            // Normalize stockLevel
            string? normalizedStockLevel = null;
            if (!string.IsNullOrWhiteSpace(stockLevel))
                normalizedStockLevel = stockLevel.Trim().ToLowerInvariant();

            try
            {
                // Fetch inventory items for the organization
                var (items, totalCount) = await _inventoryRepo.GetPagedForOrganizationAsync(
                    orgId.Value,
                    normalizedStockLevel ?? string.Empty,
                    supplierId,
                    categoryId,
                    Math.Max(1, page),
                    Math.Clamp(pageSize, 1, 200)
                );

                // Fetch suppliers and categories for the organization
                var suppliers = await _inventoryRepo.GetSuppliersForOrganizationAsync(orgId.Value);
                var categories = await _inventoryRepo.GetCategoriesForOrganizationAsync(orgId.Value);

                // Return inventory items, suppliers, and categories
                return Ok(new { items, totalCount, suppliers, categories });
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                _logger.LogError(ex, "Failed to load organization-wide inventory items");
                try {await _auditLogger.LogExceptionAsync("Failed to load organization-wide inventory items", ex.StackTrace); } catch { }
                
                return StatusCode(500, "Failed to load organization-wide inventory items");
            }
        }

        // GET api/inventoryitems/template
        // Generates an Excel template for bulk uploading inventory items.
        [HttpGet("template")]
        public IActionResult GenerateInventoryTemplate()
        {
            try
            {
                // Call the repository method to generate the template
                var template = _inventoryRepo.GenerateInventoryTemplate();

                // Return the template as a downloadable Excel file
                return File(template, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "InventoryTemplate.xlsx");
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                _logger.LogError(ex, "Failed to generate inventory template");

                return StatusCode(500, "Failed to generate inventory template");
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

        // POST api/inventoryitems/upload
        // Handles bulk upload of inventory items.
        [Authorize]
        [HttpPost("upload")]
        public async Task<IActionResult> UploadInventoryItems([FromForm] UploadInventoryItemsDto dto)
        {
            try
            {
                if (dto.File == null || dto.File.Length == 0)
                    return BadRequest("No file uploaded or file is empty.");

                // Resolve user ID
                var userId = await ResolveUserIdAsync();
                if (!userId.HasValue) return Unauthorized();

                // Fetch domain user
                var domainUser = await _userRepository.GetByIdAsync(userId.Value);
                if (domainUser == null) return Unauthorized();

                // Determine store ID
                var isOrgAdmin = User.IsInRole("Organization Admin");
                int? resolvedStoreId = isOrgAdmin ? dto.StoreId : domainUser.StoreId;

                if (!resolvedStoreId.HasValue)
                    return BadRequest("Unable to resolve store for the current user.");

                // Process the uploaded file
                using var stream = dto.File.OpenReadStream();
                var (success, message) = await _inventoryRepo.UploadInventoryItemsAsync(stream, resolvedStoreId.Value);

                if (!success)
                    return BadRequest(message);

                return Ok(new { message = "Inventory items uploaded successfully." });
            }
            catch (Exception ex)
            {
                // Log error and return 500 status
                try {await _auditLogger.LogExceptionAsync("Failed to upload inventory items", ex.StackTrace); } catch { }
                
                return StatusCode(500, "An error occurred while processing the file.");
            }
        }

    }
}