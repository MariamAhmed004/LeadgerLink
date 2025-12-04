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

        public ProductsController(LedgerLinkDbContext context, IProductRepository productRepository)
        {
            _context = context;
            _productRepository = productRepository;
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

            // Delegate product retrieval and mapping to repository (preserves original logic)
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
    }
}
