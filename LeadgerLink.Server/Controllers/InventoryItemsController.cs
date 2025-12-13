using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/inventoryitems")]
    public class InventoryItemsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IInventoryItemRepository _inventoryRepo;
        private readonly IRepository<Supplier> _supplierRepo;
        private readonly IProductRepository _productRepo;
        private readonly ILogger<InventoryItemsController> _logger;

        public InventoryItemsController(
            LedgerLinkDbContext context,
            IInventoryItemRepository inventoryRepo,
            IRepository<Supplier> supplierRepo,
            IProductRepository productRepo,
            ILogger<InventoryItemsController> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _inventoryRepo = inventoryRepo ?? throw new ArgumentNullException(nameof(inventoryRepo));
            _supplierRepo = supplierRepo ?? throw new ArgumentNullException(nameof(supplierRepo));
            _productRepo = productRepo ?? throw new ArgumentNullException(nameof(productRepo));
            _logger = logger;
        }

        // GET api/inventoryitems/lookups
        [HttpGet("lookups")]
        public async Task<ActionResult> GetLookups()
        {
            try
            {
                var (units, vatCategories) = await _inventoryRepo.GetLookupsAsync();
                return Ok(new { units, vatCategories });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load lookups");
                return StatusCode(500, "Failed to load lookups");
            }
        }

        // GET api/inventoryitems/list-for-current-store
        // Returns paged inventory items for the authenticated user's store.
        // Optional query parameters:
        // - stockLevel: string ("inStock", "lowStock", "outOfStock" or any case variant)
        // - supplierId: int
        // - categoryId: int
        // - page (1-based), pageSize
        // - for org admins: optional storeId to view a particular store in the org
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
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });

            // Determine whether caller may request org-wide data
            var isOrgAdmin = User.IsInRole("Organization Admin");

            // Resolve store id
            int? resolvedStoreId = null;
            if (!isOrgAdmin)
            {
                if (!domainUser.StoreId.HasValue) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });
                resolvedStoreId = domainUser.StoreId.Value;
            }
            else
            {
                // org admin may optionally pass a storeId to focus the listing on a single store
                if (storeId.HasValue)
                {
                    resolvedStoreId = storeId.Value;
                }
                else if (domainUser.StoreId.HasValue)
                {
                    // fallback to user's store if no storeId provided
                    resolvedStoreId = domainUser.StoreId.Value;
                }
                else
                {
                    // if org admin and no specific store requested, we cannot infer a single store - return empty.
                    return Ok(new { items = Array.Empty<object>(), totalCount = 0 });
                }
            }

            if (!resolvedStoreId.HasValue) return Ok(new { items = Array.Empty<object>(), totalCount = 0 });

            try
            {
                // Normalize client stockLevel values (e.g. "inStock" -> "instock")
                string? normalizedStockLevel = null;
                if (!string.IsNullOrWhiteSpace(stockLevel))
                {
                    normalizedStockLevel = stockLevel.Trim().ToLowerInvariant();
                }

                // repository expects values like "instock", "lowstock", "outofstock"
                var (items, totalCount) = await _inventoryRepo.GetPagedForStoreAsync(
                    resolvedStoreId.Value,
                    normalizedStockLevel ?? string.Empty,
                    supplierId,
                    categoryId,
                    Math.Max(1, page),
                    Math.Clamp(pageSize, 1, 200)
                );

                // attempt to include suppliers/categories for the store to help client UI (best-effort)
                var suppliers = await _inventoryRepo.GetSuppliersForStoreAsync(resolvedStoreId.Value);
                var categories = await _inventoryRepo.GetCategoriesForStoreAsync(resolvedStoreId.Value);

                return Ok(new { items, totalCount, suppliers, categories });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load inventory items for store");
                return StatusCode(500, "Failed to load inventory items");
            }
        }

        // POST api/inventoryitems
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> CreateInventoryItem()
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null) return BadRequest("Unable to resolve user.");

            CreateInventoryItemDto dto;

            // Support multipart/form-data (image) with 'payload' JSON field OR JSON body
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

            // Server-side validation per rules
            if (string.IsNullOrWhiteSpace(dto?.inventoryItemName) || dto.inventoryItemName.Trim().Length < 3)
                return BadRequest("Item name must be at least 3 characters.");

            if (dto.shortDescription != null && dto.shortDescription.Trim().Length > 0 && dto.shortDescription.Trim().Length < 3)
                return BadRequest("Short description must be at least 3 characters when provided.");

            if (dto.productDescription != null && dto.productDescription.Trim().Length > 0 && dto.productDescription.Trim().Length < 3)
                return BadRequest("Product description must be at least 3 characters when provided.");

            // Supplier logic: either supplierId provided OR both newSupplier.name + contactMethod provided
            if (!dto.supplierId.HasValue)
            {
                if (dto.newSupplier == null
                    || string.IsNullOrWhiteSpace(dto.newSupplier.name)
                    || string.IsNullOrWhiteSpace(dto.newSupplier.contactMethod)
                    || dto.newSupplier.name.Trim().Length < 3
                    || dto.newSupplier.contactMethod.Trim().Length < 3)
                {
                    return BadRequest("Provide existing supplierId or a valid newSupplier (name and contactMethod, each >= 3 chars).");
                }
            }

            // Numeric validations: must be non-negative
            if (dto.quantity.HasValue && dto.quantity.Value < 0) return BadRequest("Quantity cannot be negative.");
            if (dto.costPerUnit.HasValue && dto.costPerUnit.Value < 0) return BadRequest("Cost per unit cannot be negative.");
            if (dto.minimumQuantity.HasValue && dto.minimumQuantity.Value < 0) return BadRequest("Minimum quantity cannot be negative.");

            // If set on sale: require selling price and VAT category (Product.VatCategoryId is non-nullable)
            if (dto.isOnSale)
            {
                if (!dto.sellingPrice.HasValue) return BadRequest("Selling price must be provided when item is set on sale.");
                if (dto.sellingPrice.Value < 0) return BadRequest("Selling price cannot be negative.");
                if (!dto.vatCategoryId.HasValue) return BadRequest("VAT category must be selected when item is set on sale.");
            }

            // --- StoreId resolution logic ---
            int? resolvedStoreId = null;
            resolvedStoreId = dto.storeId.HasValue && dto.storeId.Value > 0
                ? dto.storeId
                : domainUser.StoreId;

            if (!resolvedStoreId.HasValue)
                return BadRequest("Unable to resolve store for inventory item.");

            try
            {
                // Begin transaction so supplier creation + item creation (+ product creation) are atomic
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
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    SupplierId = resolvedSupplierId,
                    UserId = domainUser.UserId
                };

                // handle image if present
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
                        var vatEntity = await _context.Set<Models.VatCategory>().FindAsync(dto.vatCategoryId.Value);
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

                return CreatedAtAction(nameof(GetById), new { id = addedItem.InventoryItemId }, addedItem);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error saving inventory item");
                return StatusCode(500, "Failed to save inventory item.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create inventory item");
                return StatusCode(500, "Failed to create inventory item.");
            }
        }

        // Optional: GET api/inventoryitems/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            var dto = await _inventoryRepo.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        // GET api/inventoryitems/{id}/image
        [HttpGet("{id:int}/image")]
        public async Task<IActionResult> GetImage(int id)
        {
            var item = await _inventoryRepo.GetByIdAsync(id);
            if (item == null) return NotFound();

            byte[]? bytes = null;
            try
            {
                if (item is InventoryItem ii && ii.InventoryItemImage != null)
                {
                    bytes = ii.InventoryItemImage;
                }
                else
                {
                    var dbItem = await _context.InventoryItems.FirstOrDefaultAsync(x => x.InventoryItemId == id);
                    bytes = dbItem?.InventoryItemImage;
                }
            }
            catch
            {
                var dbItem = await _context.InventoryItems.FirstOrDefaultAsync(x => x.InventoryItemId == id);
                bytes = dbItem?.InventoryItemImage;
            }

            if (bytes == null || bytes.Length == 0) return NotFound();

            // Always return JPEG for now; adjust if you store content-type alongside bytes.
            return File(bytes, "image/jpeg");
        }

        // PUT api/inventoryitems/{id}
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdateInventoryItem(int id)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.StoreId.HasValue) return BadRequest("Unable to resolve user's store.");

            // Load existing item
            var existing = await _context.InventoryItems.FirstOrDefaultAsync(x => x.InventoryItemId == id);
            if (existing == null) return NotFound();

            // DTO aligned with edit payload
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

            if (string.IsNullOrWhiteSpace(payloadStr)) return BadRequest("Missing payload.");

            // Local inline DTO matching frontend keys
            var dto = JsonSerializer.Deserialize<EditInventoryItemDto>(payloadStr!, opts);
            if (dto == null) return BadRequest("Invalid payload JSON.");

            // Basic validations (reuse create rules)
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

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Update scalar fields
                existing.InventoryItemName = dto.inventoryItemName!.Trim();
                existing.Description = string.IsNullOrWhiteSpace(dto.shortDescription) ? null : dto.shortDescription!.Trim();
                existing.InventoryItemCategoryId = dto.inventoryItemCategoryId;
                existing.UnitId = dto.unitId ?? existing.UnitId;
                existing.Quantity = dto.quantity ?? existing.Quantity;
                existing.CostPerUnit = dto.costPerUnit ?? existing.CostPerUnit;
                existing.MinimumQuantity = dto.minimumQuantity;
                existing.UpdatedAt = DateTime.UtcNow;

                // Assign supplier if provided
                if (dto.supplierId.HasValue)
                {
                    existing.SupplierId = dto.supplierId.Value;
                }

                // Edit current supplier details if provided
                if (existing.SupplierId.HasValue && dto.editSupplier != null)
                {
                    var sup = await _context.Suppliers.FirstOrDefaultAsync(s => s.SupplierId == existing.SupplierId.Value);
                    if (sup != null)
                    {
                        if (!string.IsNullOrWhiteSpace(dto.editSupplier.name)) sup.SupplierName = dto.editSupplier.name!.Trim();
                        if (!string.IsNullOrWhiteSpace(dto.editSupplier.contactMethod)) sup.ContactMethod = dto.editSupplier.contactMethod!.Trim();
                        _context.Suppliers.Update(sup);
                    }
                }

                // Replace image if multipart contains image file
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

                _context.InventoryItems.Update(existing);
                await _context.SaveChangesAsync();

                // Handle product on sale: create or update linked product
                var existingProduct = await _context.Products.FirstOrDefaultAsync(p => p.InventoryItemId == existing.InventoryItemId);
                if (dto.isOnSale)
                {
                    if (existingProduct == null)
                    {
                        var finalCost = dto.costPrice ?? existing.CostPerUnit;
                        decimal finalSelling = dto.sellingPrice ?? finalCost;
                        if (!dto.sellingPrice.HasValue && dto.vatCategoryId.HasValue)
                        {
                            var vatEntity = await _context.Set<Models.VatCategory>().FindAsync(dto.vatCategoryId.Value);
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

                await tx.CommitAsync();
                return NoContent();
            }
            catch (DbUpdateException dbEx)
            {
                await tx.RollbackAsync();
                _logger.LogError(dbEx, "Database error updating inventory item");
                return StatusCode(500, "Failed to update inventory item.");
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Failed to update inventory item");
                return StatusCode(500, "Failed to update inventory item.");
            }
        }

        // POST api/inventoryitems/{id}/restock
        [Authorize]
        [HttpPost("{id:int}/restock")]
        public async Task<ActionResult> RestockQuantity(int id, [FromBody] RestockDto dto)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            if (dto == null) return BadRequest("Missing payload.");
            if (dto.AddedQuantity <= 0) return BadRequest("Added quantity must be greater than zero.");

            var item = await _context.InventoryItems.FirstOrDefaultAsync(x => x.InventoryItemId == id);
            if (item == null) return NotFound();

            // Only update quantity
            var newQty = (item.Quantity) + dto.AddedQuantity;
            item.Quantity = newQty;
            item.UpdatedAt = DateTime.UtcNow;

            _context.InventoryItems.Update(item);
            await _context.SaveChangesAsync();

            return Ok(new { inventoryItemId = id, quantity = item.Quantity });
        }

        public class RestockDto
        {
            public decimal AddedQuantity { get; set; }
        }

        // Add this method to support organization-wide inventory fetch for org admins/managers.
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
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            // Determine organizationId: if not provided, try to infer from user
            int? orgId = organizationId;
            if (!orgId.HasValue)
            {
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

                var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (domainUser == null || !domainUser.OrgId.HasValue)
                    return BadRequest("Unable to resolve organization.");
                orgId = domainUser.OrgId.Value;
            }

            // Normalize stockLevel
            string? normalizedStockLevel = null;
            if (!string.IsNullOrWhiteSpace(stockLevel))
                normalizedStockLevel = stockLevel.Trim().ToLowerInvariant();

            try
            {
                var (items, totalCount) = await _inventoryRepo.GetPagedForOrganizationAsync(
                    orgId.Value,
                    normalizedStockLevel ?? string.Empty,
                    supplierId,
                    categoryId,
                    Math.Max(1, page),
                    Math.Clamp(pageSize, 1, 200)
                );

                var suppliers = await _inventoryRepo.GetSuppliersForOrganizationAsync(orgId.Value);
                var categories = await _inventoryRepo.GetCategoriesForOrganizationAsync(orgId.Value);

                return Ok(new { items, totalCount, suppliers, categories });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load organization-wide inventory items");
                return StatusCode(500, "Failed to load organization-wide inventory items");
            }
        }
    }
}