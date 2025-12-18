using LeadgerLink.Server.Contexts;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Implementations;
using LeadgerLink.Server.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/products")]
    public class ProductsController : ControllerBase
    {
        // Repository for managing product-related data
        private readonly IProductRepository _productRepository;

        // Repository for managing VAT category-related data
        private readonly IRepository<VatCategory> _vatRepository;

        // Repository for managing user-related data
        private readonly IUserRepository _user_repository;

        // Repository for store-related queries (used instead of DbContext)
        private readonly IStoreRepository _storeRepository;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Constructor to initialize dependencies
        public ProductsController(
            IProductRepository productRepository,
            IRepository<VatCategory> vatRepository,
            IUserRepository userRepository,
            IStoreRepository storeRepository,
            IAuditContext auditContext)
        {
            _productRepository = productRepository;
            _vatRepository = vatRepository;
            _user_repository = userRepository;
            _storeRepository = storeRepository;
            _auditContext = auditContext;
        }

        // GET api/products/vatcategories
        // Retrieves VAT categories as { vatCategoryId, vatCategoryName } for select fields.
        [HttpGet("vatcategories")]
        public async Task<ActionResult> GetVatCategories()
        {
            // Fetch all VAT categories
            var all = await _vatRepository.GetAllAsync();

            // Map to lightweight DTO
            var list = (all ?? Enumerable.Empty<VatCategory>())
                .OrderBy(v => v.VatCategoryName)
                .Select(v => new
                {
                    vatCategoryId = v.VatCategoryId,
                    vatCategoryName = v.VatCategoryName,
                    vatRate = v.VatRate
                })
                .ToList();

            // Return the result
            return Ok(list);
        }

        // GET api/products/for-current-store
        // Retrieves products for the authenticated user's store, including availability.
        [Authorize]
        [HttpGet("for-current-store")]
        public async Task<ActionResult> GetForCurrentStore([FromQuery] int? storeId = null)
        {
            // Validate user authentication and resolve domain user
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            var userId = await ResolveUserIdAsync();
            if (!userId.HasValue) return Unauthorized();
            var domainUser = await _user_repository.GetByIdAsync(userId.Value);
            if (domainUser == null) return Unauthorized();

            var isOrgAdmin = User.IsInRole("Organization Admin");
            int resolvedStoreId;

            if (storeId.HasValue)
            {
                // Only Organization Admins may specify storeId
                if (!isOrgAdmin)
                {
                    return Forbid("Only Organization Admins can specify storeId.");
                }

                // Validate store exists and belongs to the same organization as the admin user using store repository
                var store = await _storeRepository.GetByIdWithRelationsAsync(storeId.Value);
                if (store == null)
                {
                    return BadRequest("Invalid store ID.");
                }

                if (!domainUser.OrgId.HasValue || store.OrgId != domainUser.OrgId)
                {
                    return Forbid("The specified store does not belong to the same organization as the user.");
                }

                resolvedStoreId = storeId.Value;
            }
            else
            {
                // Fallback to the user's store
                if (!domainUser.StoreId.HasValue) return Ok(new ProductListDto[0]);
                resolvedStoreId = domainUser.StoreId.Value;
            }

            // Fetch products for the resolved store
            var list = await _productRepository.GetForStoreAsync(resolvedStoreId);

            // Return the result
            return Ok(list);
        }

        // GET api/products/{id}
        // Retrieves detailed information about a specific product.
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            // Fetch the product details
            var dto = await _productRepository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();

            // Return the result
            return Ok(dto);
        }

        // PUT: api/products/{id}
        // Updates an existing product.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
        {
            // Validate the input DTO and product ID
            if (dto == null || id != dto.ProductId) return BadRequest("Invalid payload.");

            // Fetch the existing product
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return NotFound();

            // Set the audit context user ID
            await SetAuditContextUserId();

            // Map updatable fields
            product.ProductName = dto.ProductName?.Trim() ?? product.ProductName;
            product.SellingPrice = dto.SellingPrice;
            product.VatCategoryId = dto.VatCategoryId;
            product.Description = dto.Description;

            // Update the product
            await _productRepository.UpdateAsync(product);
            return NoContent();
        }

        // GET api/products/for-organization/{organizationId}
        // Retrieves products for a specific organization.
        [Authorize]
        [HttpGet("for-organization/{organizationId}")]
        public async Task<ActionResult> GetForOrganization(int organizationId)
        {
            // Validate the organization ID
            if (organizationId <= 0) return BadRequest("Invalid organization ID.");

            // Fetch products for the organization
            var list = await _productRepository.GetForOrganizationAsync(organizationId);

            // Return the result
            return Ok(list);
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
            var user = await _user_repository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());

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
