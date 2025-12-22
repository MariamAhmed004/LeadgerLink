using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using DocumentFormat.OpenXml.Wordprocessing;
using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Dtos.RecipeDtos;
using LeadgerLink.Server.Dtos.SaleDtos;
using LeadgerLink.Server.Dtos.UserDtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/sales")]
    public class SalesController : ControllerBase
    {
        // Database context for managing database operations
        private readonly LedgerLinkDbContext _context;

        // Repository for managing sale-related data
        private readonly ISaleRepository _saleRepository;

        // Repository for managing user-related data
        private readonly IUserRepository _userRepository;

        // Repository for managing payment method-related data
        private readonly IRepository<PaymentMethod> _paymentMethodRepo;

        // Logger for logging errors and information
        private readonly ILogger<SalesController> _logger;

        // Repository for managing user-related data (duplicate reference)
        private readonly IUserRepository _usersRepsitory;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Constructor to initialize dependencies
        public SalesController(
            LedgerLinkDbContext context,
            ISaleRepository saleRepository,
            IUserRepository userRepository,
            IRepository<PaymentMethod> paymentMethodRepo,
            ILogger<SalesController> logger,
            IUserRepository usersRepsitory, 
            IAuditContext auditContext)
        {
            _context = context;
            _saleRepository = saleRepository;
            _userRepository = userRepository;
            _paymentMethodRepo = paymentMethodRepo;
            _logger = logger;
            _usersRepsitory = usersRepsitory;
            _auditContext = auditContext;
        }

        // GET api/sales/sum
        // Returns the sum of TotalAmount for sales belonging to stores of the specified organization.
        [HttpGet("sum")]
        public async Task<ActionResult<decimal>> Sum(
            [FromQuery] int organizationId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            try
            {
                // Delegate the query logic to the repository
                var total = await _saleRepository.SumSalesForOrganizationAsync(organizationId, from, to);

                // Return the result
                return Ok(total);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to calculate sales sum for organization {OrgId}", organizationId);
                return StatusCode(500, "Failed to calculate sales sum.");
            }
        }

        // GET api/sales/payment-methods
        // Returns list of payment methods for populating a select box.
        [HttpGet("payment-methods")]
        public async Task<ActionResult<IEnumerable<object>>> GetPaymentMethods()
        {
            // Fetch all payment methods
            var all = await _paymentMethodRepo.GetAllAsync();

            // Map payment methods to a lightweight DTO
            var items = (all ?? Enumerable.Empty<PaymentMethod>())
                .Select(pm => new { paymentMethodId = pm.PaymentMethodId, name = pm.PaymentMethodName })
                .ToList();

            // Return the result
            return Ok(items);
        }

        // GET api/sales/current-store-month
        // Returns the sum of TotalAmount for sales belonging to the store of the currently authenticated user for the current month.
        [Authorize]
        [HttpGet("current-store-month")]
        public async Task<ActionResult<decimal>> SumForCurrentStoreMonth()
        {
            try
            {
                // Validate user authentication
                if (User?.Identity?.IsAuthenticated != true)
                    return Unauthorized();

                // Resolve the user's email
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                // Fetch the user's store ID
                var user = await _usersRepsitory.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (user == null || !user.StoreId.HasValue)
                    return Ok(0m);

                var storeId = user.StoreId.Value;

                // Delegate the query logic to the repository
                var total = await _saleRepository.SumSalesForCurrentMonthAsync(storeId);

                // Return the result
                return Ok(total);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to calculate sales sum for the current store month");
                return StatusCode(500, "Failed to calculate sales sum.");
            }
        }

        // GET api/sales/best-for-current-store
        // Returns the best selling recipe (by quantity) for the authenticated user's store.
        [Authorize]
        [HttpGet("best-for-current-store")]
        public async Task<ActionResult<BestSellingRecipeDto?>> GetBestSellingRecipeForCurrentStore()
        {
            try
            {
                // Validate user authentication
                if (User?.Identity?.IsAuthenticated != true)
                    return Unauthorized();

                // Resolve the user's email
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;

                if (string.IsNullOrWhiteSpace(email))
                    return Unauthorized();

                // Fetch the user's store ID
                var user = await _usersRepsitory.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
                if (user == null || !user.StoreId.HasValue)
                    return Ok(null);

                var storeId = user.StoreId.Value;

                // Delegate the query logic to the repository
                var bestSellingRecipe = await _saleRepository.GetBestSellingRecipeForStoreAsync(storeId);

                // Return the result
                return Ok(bestSellingRecipe);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to retrieve best-selling recipe for the current store");
                return StatusCode(500, "Failed to retrieve best-selling recipe.");
            }
        }

        // GET api/sales?storeId=5
        // If storeId is provided, it returns sales for that store; otherwise, it resolves the current authenticated user's store and returns sales for it.
        [Authorize]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SaleListDto>>> GetSalesByStore([FromQuery] int? storeId)
        {
            int resolvedStoreId;

            // Resolve the store ID
            if (storeId.HasValue)
            {
                resolvedStoreId = storeId.Value;
            }
            else
            {
                var resolved = await ResolveStoreIdForCurrentUserAsync();
                if (!resolved.HasValue) return Unauthorized();
                resolvedStoreId = resolved.Value;
            }

            // Fetch sales for the resolved store
            var sales = await _saleRepository.GetSalesByStoreAsync(resolvedStoreId);

            // Return the result
            return Ok(sales);
        }

        // POST api/sales
        // Creates a new sale with items for the specified or resolved store.
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSaleDto dto, [FromQuery] int? storeId)
        {
            try
            {
                // Validate user authentication
                if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

                // Validate the request body
                if (dto == null) return BadRequest("Body is required.");

                // Resolve the store ID
                int? resolvedStoreId = null;
                var isOrgAdmin = User.IsInRole("Organization Admin");

                if (isOrgAdmin && storeId.HasValue)
                {
                    resolvedStoreId = storeId.Value;
                }
                else
                {
                    resolvedStoreId = await ResolveStoreIdForCurrentUserAsync();
                }

                if (!resolvedStoreId.HasValue) return Unauthorized();

                // Validate sale items
                var hasItems = dto.Items != null && dto.Items.Any(i => i != null && i.ProductId > 0 && i.Quantity > 0);
                if (!hasItems) return BadRequest("At least one item (product/recipe) must be selected.");

                // Resolve the current logged-in user ID
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                            ?? User.Identity?.Name;
                var domainUser = await _usersRepsitory.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email!.ToLower());
                if (domainUser == null) return Unauthorized();
                var currentUserId = domainUser.UserId;

                // Validate the payment method if provided
                if (dto.PaymentMethodId.HasValue)
                {
                    var pmExists = await _paymentMethodRepo.AnyAsync(p => p.PaymentMethodId == dto.PaymentMethodId.Value);
                    if (!pmExists) return BadRequest("Invalid payment method.");
                }

                // Set the audit context user ID
                await SetAuditContextUserId();

                // Begin a database transaction
                await using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Delegate the sale creation logic to the repository
                    var saleId = await _saleRepository.CreateSaleAsync(dto, resolvedStoreId.Value, currentUserId);

                    // Commit the transaction
                    await tx.CommitAsync();

                    // Return the result
                    return CreatedAtAction(nameof(GetSalesByStore), new { storeId = resolvedStoreId.Value }, new { saleId });
                }
                catch (Exception ex)
                {
                    // Rollback the transaction on error
                    await tx.RollbackAsync();
                    _logger.LogError(ex, "Failed to create sale");
                    return StatusCode(500, "Failed to create sale.");
                }
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "An error occurred while creating the sale");
                return StatusCode(500, "An error occurred while creating the sale.");
            }
        }

        // GET api/sales/store-users?storeId=5
        // Returns users for the store (for populating the "Created By" filter).
        [Authorize]
        [HttpGet("store-users")]
        public async Task<ActionResult<IEnumerable<UserListItemDto>>> GetUsersForStore([FromQuery] int? storeId)
        {
            int resolvedStoreId;

            // Resolve the store ID
            if (storeId.HasValue)
            {
                resolvedStoreId = storeId.Value;
            }
            else
            {
                // Resolve the store ID for the current authenticated user
                var resolved = await ResolveStoreIdForCurrentUserAsync();
                if (!resolved.HasValue) return Unauthorized();
                resolvedStoreId = resolved.Value;
            }

            // Fetch users for the resolved store
            var users = await _userRepository.GetUsersByStoreAsync(resolvedStoreId);

            // Return the result
            return Ok(users);
        }

        // GET api/sales/{id}
        [Authorize]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<SaleDetailDto>> GetById(int id)
        {
            try
            {
                //resolve user ID
                var userId = await ResolveUserIdAsync();

                if (!userId.HasValue)
                    return Unauthorized();
                else
                {

                    // Delegate the query logic to the repository
                    var saleDetail = await _saleRepository.GetSaleByIdAsync(id, userId.Value);

                    // Return 404 if no sale is found
                    if (saleDetail == null) return NotFound();

                    // Return the result
                    return Ok(saleDetail);
                }
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to retrieve sale details for sale ID {SaleId}", id);
                return StatusCode(500, "Failed to retrieve sale details.");
            }
        }

        // PUT api/sales/{id}
        // Updates an existing sale with new details and items.
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateSaleDto dto, [FromQuery] int? storeId = null)
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

            // Validate the request body
            if (dto == null) return BadRequest("Invalid payload.");

            // Validate sale items
            var hasItems = dto.Items != null && dto.Items.Any(i => i != null && i.ProductId > 0 && i.Quantity > 0);
            if (!hasItems) return BadRequest("At least one item (product/recipe) must be selected.");

            // Validate the payment method if provided
            if (dto.PaymentMethodId.HasValue)
            {
                var pmExists = await _paymentMethodRepo.AnyAsync(p => p.PaymentMethodId == dto.PaymentMethodId.Value);
                if (!pmExists) return BadRequest("Invalid payment method.");
            }

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Begin a database transaction
            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delegate the update logic to the repository
                var success = await _saleRepository.UpdateSaleAsync(id, dto);

                // If the update fails (e.g., sale not found), return NotFound
                if (!success) return NotFound();

                // Commit the transaction
                await tx.CommitAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                // Rollback the transaction on database update error
                await tx.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
            catch (Exception ex)
            {
                // Rollback the transaction on general error
                await tx.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
        }

        // Helper to resolve current authenticated user's store id
        private async Task<int?> ResolveStoreIdForCurrentUserAsync()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return null;

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return null;

            // Fetch the user from the repository
            var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.StoreId.HasValue)
                return null;

            return domainUser.StoreId.Value;
        }

        [Authorize(Roles = "Organization Admin")]
        [HttpGet("by-organization")]
        public async Task<ActionResult<IEnumerable<SaleListDto>>> GetSalesByOrganization([FromQuery] int organizationId)
        {
            if (organizationId <= 0) return BadRequest("organizationId is required.");

            try
            {
                var list = await _saleRepository.GetSalesByOrganizationAsync(organizationId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load sales for organization {OrgId}", organizationId);
                return StatusCode(500, "Failed to load sales");
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