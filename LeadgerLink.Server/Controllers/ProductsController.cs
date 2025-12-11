using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/products")]
    public class ProductsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IProductRepository _productRepository;
        private readonly IRepository<VatCategory> _vatRepository;

        public ProductsController(
            LedgerLinkDbContext context,
            IProductRepository productRepository,
            IRepository<VatCategory> vatRepository)
        {
            _context = context;
            _productRepository = productRepository;
            _vatRepository = vatRepository;
        }

        // GET api/products/vatcategories
        // Returns VAT categories as { vatCategoryId, vatCategoryName } for select fields.
        [HttpGet("vatcategories")]
        public async Task<ActionResult> GetVatCategories()
        {
            var all = await _vatRepository.GetAllAsync();
            var list = (all ?? Enumerable.Empty<VatCategory>())
                .OrderBy(v => v.VatCategoryName)
                .Select(v => new
                {
                    vatCategoryId = v.VatCategoryId,
                    vatCategoryName = v.VatCategoryName,
                    vatRate = v.VatRate
                })
                .ToList();

            return Ok(list);
        }

        // GET api/products/for-current-store
        // Returns products for the authenticated user's store including availability.
        [Authorize]
        [HttpGet("for-current-store")]
        public async Task<ActionResult> GetForCurrentStore()
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;
            if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue) return Ok(new ProductListDto[0]);

            var storeId = user.StoreId.Value;

            var list = await _productRepository.GetForStoreAsync(storeId);
            return Ok(list);
        }

        // GET api/products/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            var dto = await _productRepository.GetDetailByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        // PUT: api/products/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
        {
            if (dto == null || id != dto.ProductId) return BadRequest("Invalid payload.");
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return NotFound();

            product.ProductName = dto.ProductName?.Trim() ?? product.ProductName;
            product.SellingPrice = dto.SellingPrice;
            product.VatCategoryId = dto.VatCategoryId;
            product.Description = dto.Description;
            // CostPrice is not editable here
            await _productRepository.UpdateAsync(product);
            return NoContent();
        }
    }

    public class UpdateProductDto
    {
        public int ProductId { get; set; }
        public string? ProductName { get; set; }
        public decimal SellingPrice { get; set; }
        public int VatCategoryId { get; set; }
        public string? Description { get; set; }
    }
}
