using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;
using System.Collections.Generic;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/sales")]
    public class SalesController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly ISaleRepository _saleRepository;
        private readonly IUserRepository _userRepository;
        private readonly IRepository<PaymentMethod> _paymentMethodRepo;

        public SalesController(LedgerLinkDbContext context, ISaleRepository saleRepository, IUserRepository userRepository, IRepository<PaymentMethod> paymentMethodRepo)
        {
            _context = context;
            _saleRepository = saleRepository;
            _userRepository = userRepository;
            _paymentMethodRepo = paymentMethodRepo;
        }

        // GET api/sales/sum?organizationId=5&from=2025-11-27&to=2025-11-27
        // Returns the sum of TotalAmount for sales belonging to stores of the specified organization.
        // Optional from/to filter by date (YYYY-MM-DD). If omitted, all matching rows are summed.
        [HttpGet("sum")]
        public async Task<ActionResult<decimal>> Sum(
            [FromQuery] int organizationId,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null)
        {
            var q = _context.Sales
                .Include(s => s.Store)
                .AsQueryable();

            q = q.Where(s => s.Store != null && s.Store.OrgId == organizationId);

            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                q = q.Where(s => s.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(s => s.Timestamp <= toDate);
            }

            var sum = await q.SumAsync(s => (decimal?)s.TotalAmount);
            return Ok(sum ?? 0m);
        }

        // GET api/sales/payment-methods
        // Returns list of payment methods for populating a select box.
        [HttpGet("payment-methods")]
        public async Task<ActionResult<IEnumerable<object>>> GetPaymentMethods()
        {
            var all = await _paymentMethodRepo.GetAllAsync();
            var items = (all ?? Enumerable.Empty<PaymentMethod>())
                .Select(pm => new { paymentMethodId = pm.PaymentMethodId, name = pm.PaymentMethodName })
                .ToList();
            return Ok(items);
        }

        // GET api/sales/current-store-month
        // Returns the sum of TotalAmount for sales belonging to the store of the currently authenticated user for the current month.
        [Authorize]
        [HttpGet("current-store-month")]
        public async Task<ActionResult<decimal>> SumForCurrentStoreMonth()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Ok(0m);

            var storeId = user.StoreId.Value;
            var now = DateTime.UtcNow;
            var year = now.Year;
            var month = now.Month;

            var sum = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return Ok(sum ?? 0m);
        }

        // GET api/sales/best-for-current-store
        // Returns the best selling recipe (by quantity) for the authenticated user's store.
        [Authorize]
        [HttpGet("best-for-current-store")]
        public async Task<ActionResult<BestSellingRecipeDto?>> GetBestSellingRecipeForCurrentStore()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Ok(null);

            var storeId = user.StoreId.Value;

            var top = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .Where(si => si.Sale != null
                             && si.Sale.StoreId == storeId
                             && si.Product != null
                             && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .FirstOrDefaultAsync();

            if (top == null || top.RecipeId == null)
                return Ok(null);

            var recipe = await _context.Recipes
                .Where(r => r.RecipeId == top.RecipeId)
                .Select(r => new BestSellingRecipeDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    TotalQuantity = top.TotalQty
                })
                .FirstOrDefaultAsync();

            return Ok(recipe);
        }

        // GET api/sales?storeId=5
        // If storeId is provided it returns sales for that store, otherwise it resolves the current authenticated user's store and returns sales for it.
        [Authorize]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SaleListDto>>> GetSalesByStore([FromQuery] int? storeId)
        {
            int resolvedStoreId;

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

            var sales = await _saleRepository.GetSalesByStoreAsync(resolvedStoreId);
            return Ok(sales);
        }

        // POST api/sales
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSaleDto dto, [FromQuery] int? storeId)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            if (dto == null) return BadRequest("Body is required.");

            // Resolve store id:
            int? resolvedStoreId = null;
            var isOrgAdmin = User.IsInRole("Organization Admin") || User.IsInRole("Application Admin");

            if (isOrgAdmin && storeId.HasValue)
            {
                resolvedStoreId = storeId.Value;
            }
            else
            {
                resolvedStoreId = await ResolveStoreIdForCurrentUserAsync();
            }

            if (!resolvedStoreId.HasValue) return Unauthorized();

            var hasItems = dto.Items != null && dto.Items.Any(i => i != null && i.ProductId > 0 && i.Quantity > 0);
            if (!hasItems) return BadRequest("At least one item (product/recipe) must be selected.");

            // Resolve current logged-in user id (always use this; ignore dto.UserId)
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email!.ToLower());
            if (domainUser == null) return Unauthorized();
            var currentUserId = domainUser.UserId;

            // optional: validate payment method exists
            if (dto.PaymentMethodId.HasValue)
            {
                var pmExists = await _context.PaymentMethods.AnyAsync(p => p.PaymentMethodId == dto.PaymentMethodId.Value);
                if (!pmExists) return BadRequest("Invalid payment method.");
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var sale = new Sale
                {
                    Timestamp = dto.Timestamp == default ? DateTime.UtcNow : dto.Timestamp,
                    UserId = currentUserId, // always the current logged-in user
                    StoreId = resolvedStoreId.Value,
                    TotalAmount = dto.TotalAmount,
                    AppliedDiscount = dto.AppliedDiscount,
                    PaymentMethodId = dto.PaymentMethodId,
                    Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim(),
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                };

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                // insert items
                foreach (var it in dto.Items!.Where(i => i.Quantity > 0))
                {
                    var item = new SaleItem
                    {
                        SaleId = sale.SaleId,
                        ProductId = it.ProductId,
                        Quantity = it.Quantity
                    };
                    _context.SaleItems.Add(item);
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return CreatedAtAction(nameof(GetSalesByStore), new { storeId = resolvedStoreId.Value }, new { saleId = sale.SaleId });
            }
            catch (DbUpdateException ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
        }

        // GET api/sales/store-users?storeId=5
        // Returns users for the store (for populating the "Created By" filter).
        [Authorize]
        [HttpGet("store-users")]
        public async Task<ActionResult<IEnumerable<UserListItemDto>>> GetUsersForStore([FromQuery] int? storeId)
        {
            int resolvedStoreId;

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

            var users = await _userRepository.GetUsersByStoreAsync(resolvedStoreId);
            return Ok(users);
        }

        // GET api/sales/{id}
        [Authorize]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<SaleDetailDto>> GetById(int id)
        {
            var sale = await _context.Sales
                .Include(s => s.PaymentMethod)
                .Include(s => s.SaleItems)
                    .ThenInclude(si => si.Product)
                .FirstOrDefaultAsync(s => s.SaleId == id);

            if (sale == null) return NotFound();

            var dto = new SaleDetailDto
            {
                SaleId = sale.SaleId,
                Timestamp = sale.Timestamp,
                TotalAmount = sale.TotalAmount,
                AppliedDiscount = sale.AppliedDiscount,
                PaymentMethodId = sale.PaymentMethodId,
                PaymentMethodName = sale.PaymentMethod?.PaymentMethodName,
                Notes = sale.Notes,
                CreatedById = sale.UserId,
                CreatedByName = await _context.Users
                    .Where(u => u.UserId == sale.UserId)
                    .Select(u => ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim())
                    .FirstOrDefaultAsync(),
                CreatedAt = sale.CreatedAt,
                UpdatedAt = sale.UpdatedAt,
                SaleItems = sale.SaleItems.Select(si => new SaleItemDetailDto
                {
                    ProductId = si.ProductId,
                    Quantity = si.Quantity,
                    ProductName = si.Product?.ProductName
                }).ToList()
            };

            return Ok(dto);
        }

        // PUT api/sales/{id}
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CreateSaleDto dto)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            if (dto == null) return BadRequest("Invalid payload.");

            var sale = await _context.Sales.Include(s => s.SaleItems).FirstOrDefaultAsync(s => s.SaleId == id);
            if (sale == null) return NotFound();

            var hasItems = dto.Items != null && dto.Items.Any(i => i != null && i.ProductId > 0 && i.Quantity > 0);
            if (!hasItems) return BadRequest("At least one item (product/recipe) must be selected.");

            if (dto.PaymentMethodId.HasValue)
            {
                var pmExists = await _context.PaymentMethods.AnyAsync(p => p.PaymentMethodId == dto.PaymentMethodId.Value);
                if (!pmExists) return BadRequest("Invalid payment method.");
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                sale.Timestamp = dto.Timestamp == default ? sale.Timestamp : dto.Timestamp;
                sale.TotalAmount = dto.TotalAmount;
                sale.AppliedDiscount = dto.AppliedDiscount;
                sale.PaymentMethodId = dto.PaymentMethodId;
                sale.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim();
                sale.UpdatedAt = DateTime.UtcNow.ToString("o");

                // Replace existing sale items with those provided by client
                _context.SaleItems.RemoveRange(sale.SaleItems);
                foreach (var it in dto.Items!.Where(i => i.Quantity > 0))
                {
                    _context.SaleItems.Add(new SaleItem
                    {
                        SaleId = sale.SaleId,
                        ProductId = it.ProductId,
                        Quantity = it.Quantity
                    });
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, ex.Message);
            }
            catch (Exception ex)
            {
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

            var domainUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (domainUser == null || !domainUser.StoreId.HasValue)
                return null;

            return domainUser.StoreId.Value;
        }
    }
}