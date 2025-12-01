using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public class CategoriesController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;

        public CategoriesController(LedgerLinkDbContext context)
        {
            _context = context;
        }

        // GET api/categories
        // Returns all inventory item categories in the system.
        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            var categories = await _context.InventoryItemCategories
                .Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName })
                .ToListAsync();

            return Ok(categories);
        }
    }
}