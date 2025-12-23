using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/categories")]
    public class CategoriesController : ControllerBase
    {
        // General repository for accessing inventory item categories
        private readonly IRepository<InventoryItemCategory> _categoryRepository;

        // Audit logger for logging exceptions
        private readonly IAuditLogger _auditLogger;

        // Constructor to initialize dependencies
        public CategoriesController(IRepository<InventoryItemCategory> categoryRepository, IAuditLogger auditLogger)
        {
            _categoryRepository = categoryRepository;
            _auditLogger = auditLogger;
        }

        // GET api/categories
        // Returns all inventory item categories in the system.
        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            try
            {
                // ------------------------- Fetch categories -------------------------
                var categories = await _categoryRepository.GetAllAsync();

                // ------------------------- Transform data -------------------------
                var result = categories.Select(c => new { id = c.InventoryItemCategoryId, name = c.InventoryItemCategoryName });

                // ------------------------- Return result -------------------------
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Log the exception
                try { await _auditLogger.LogExceptionAsync("Failed to fetch categories", ex.StackTrace); } catch { }
                return StatusCode(500, "An error occurred while fetching categories.");
            }
        }
    }
}