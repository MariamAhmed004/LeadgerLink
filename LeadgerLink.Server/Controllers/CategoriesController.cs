using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public class CategoriesController : ControllerBase
    {
        // General repository for accessing inventory item categories
        private readonly IRepository<InventoryItemCategory> _categoryRepository;

        // Constructor to initialize dependencies
        public CategoriesController(IRepository<InventoryItemCategory> categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        // GET api/categories
        // Returns all inventory item categories in the system.
        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            // ------------------------- Fetch categories -------------------------
            var categories = await _categoryRepository.GetAllAsync();

            // ------------------------- Transform data -------------------------
            var result = categories.Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName });

            // ------------------------- Return result -------------------------
            return Ok(result);
        }
    }
}