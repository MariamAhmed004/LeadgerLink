using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Contexts;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Organization Admin,Organization Accountant,Store Manager,Store Employee")]
    [Route("api/recipes")]
    public class RecipesController : ControllerBase
    {
        // Database context for managing database operations
        private readonly LedgerLinkDbContext _context;

        // Repository for managing recipe-related data
        private readonly IRecipeRepository _recipeRepository;

        // Repository for managing inventory item-related data
        private readonly IInventoryItemRepository _inventoryRepository;

        // Repository for managing VAT category-related data
        private readonly IRepository<VatCategory> _vatRepository;

        // Logger for logging errors and information
        private readonly ILogger<SalesController> _logger;

        // Repository for managing user-related data
        private readonly IRepository<User> _userRepository;

        // Context for managing audit-related data
        private readonly IAuditContext _auditContext;

        // Constructor to initialize dependencies
        public RecipesController(
            LedgerLinkDbContext context, 
            IRecipeRepository recipeRepository, 
            IInventoryItemRepository inventoryRepository, 
            IRepository<VatCategory> vatRepository, 
            ILogger<SalesController> logger, 
            IRepository<User> userRepository, 
            IAuditContext auditContext)
        {
            _context = context;
            _recipeRepository = recipeRepository;
            _inventoryRepository = inventoryRepository;
            _vatRepository = vatRepository;
            _logger = logger;
            _userRepository = userRepository;
            _auditContext = auditContext;
        }

        // GET api/recipes
        // Retrieves all recipes, optionally filtered by organization ID.
        [HttpGet]
        public async Task<ActionResult> GetAll([FromQuery] int? orgId = null)
        {
            try
            {
                // Fetch recipes from the repository
                var recipes = await _recipeRepository.GetAllRecipesAsync(orgId);

                // Return the result
                return Ok(recipes);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to retrieve recipes");
                return StatusCode(500, "Failed to retrieve recipes.");
            }
        }

        // GET api/recipes/for-current-store
        // Retrieves recipes for the authenticated user's store.
        [Authorize]
        [HttpGet("for-current-store")]
        public async Task<ActionResult> GetForCurrentStore()
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

                // Fetch recipes for the current store from the repository
                var recipes = await _recipeRepository.GetRecipesForCurrentStoreAsync(email);

                // Return the result
                return Ok(recipes);
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to retrieve recipes for the current store");
                return StatusCode(500, "Failed to retrieve recipes for the current store.");
            }
        }

        // GET api/recipes/ingredient-utilization/{storeId}
        // Retrieves ingredient utilization percentages for a specific store.
        [HttpGet("ingredient-utilization/{storeId}")]
        public async Task<ActionResult<IEnumerable<IngredientUtilizationDto>>> GetIngredientUtilizationPercentage(int storeId)
        {
            // Fetch ingredient utilization percentages from the repository
            var result = await _recipeRepository.GetIngredientUtilizationPercentageAsync(storeId);

            // Return the result
            return Ok(result);
        }

        // GET api/recipes/most-sold/organization/{organizationId}
        // Retrieves the most sold recipe for a specific organization.
        [HttpGet("most-sold/organization/{organizationId}")]
        public async Task<ActionResult<Recipe>> GetMostSoldRecipeByOrganization(int organizationId)
        {
            // Fetch the most sold recipe from the repository
            var recipe = await _recipeRepository.GetMostSoldRecipeByOrganizationAsync(organizationId);

            // Return 404 if no recipe is found
            if (recipe == null) return NotFound();

            // Return the result
            return Ok(recipe);
        }

        // GET api/recipes/most-sold/store/{storeId}
        // Retrieves the most sold recipe for a specific store.
        [HttpGet("most-sold/store/{storeId}")]
        public async Task<ActionResult<Recipe>> GetMostSoldRecipeByStore(int storeId)
        {
            // Fetch the most sold recipe from the repository
            var recipe = await _recipeRepository.GetMostSoldRecipeByStoreAsync(storeId);

            // Return 404 if no recipe is found
            if (recipe == null) return NotFound();

            // Return the result
            return Ok(recipe);
        }

        // GET api/recipes/for-store/{storeId}
        // Retrieves all recipes for a specific store.
        [HttpGet("for-store/{storeId}")]
        public async Task<ActionResult<IEnumerable<Recipe>>> GetRecipesByStore(int storeId)
        {
            // Fetch recipes for the store from the repository
            var recipes = await _recipeRepository.GetRecipesByStoreAsync(storeId);

            // Return the result
            return Ok(recipes);
        }

        // GET api/recipes/{recipeId}/with-ingredients
        // Retrieves a recipe along with its ingredients.
        [HttpGet("{recipeId}/with-ingredients")]
        public async Task<ActionResult> GetRecipeWithIngredients(int recipeId)
        {
            try
            {
                //resolve user ID
                var userId = await ResolveUserIdAsync();

                if (!userId.HasValue)
                    return Unauthorized();
                else
                {

                    // Fetch the recipe details from the repository
                    var dto = await _recipeRepository.GetDetailByIdAsync(recipeId, userId.Value);

                    // Return 404 if no recipe is found
                    if (dto == null) return NotFound();

                    // Return the result
                    return Ok(dto);

                }
            }
            catch (Exception ex)
            {
                // Log the error and return a 500 status code
                _logger.LogError(ex, "Failed to load recipe details");
                return StatusCode(500, "Failed to load recipe details");
            }
        }

        // POST api/recipes
        // Creates a new recipe with ingredients and optional product linkage.
        [Authorize]
        [HttpPost]
        public async Task<ActionResult> Create()
        {
            // Parse the payload first
            string? payloadStr = null;
            if (Request.HasFormContentType)
            {
                payloadStr = Request.Form["payload"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(payloadStr))
                {
                    var jsonFile = Request.Form.Files.FirstOrDefault(f => f.Name.Equals("payload", StringComparison.OrdinalIgnoreCase));
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

            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            using var doc = JsonDocument.Parse(payloadStr);
            var root = doc.RootElement;

            // Extract storeId from the payload
            var storeId = root.TryGetProperty("storeId", out var sid) && sid.ValueKind != JsonValueKind.Null ? sid.GetInt32() : (int?)null;

            // Resolve the logged-in user
            var email = User?.Identity?.Name;
            var user = await _userRepository.GetFirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null) return BadRequest("Unable to resolve the logged-in user.");

            // Fallback to the user's storeId if not provided in the payload
            var resolvedStoreId = storeId ?? user.StoreId;
            if (!resolvedStoreId.HasValue) return BadRequest("Unable to resolve store for the recipe.");

            // Parse other fields from the payload
            var recipeName = root.TryGetProperty("recipeName", out var rn) ? rn.GetString() : null;
            var instructions = root.TryGetProperty("instructions", out var instr) ? instr.GetString() : null;
            var isOnSale = root.TryGetProperty("isOnSale", out var ios) && ios.GetBoolean();
            var vatCategoryId = root.TryGetProperty("vatCategoryId", out var vat) && vat.ValueKind != JsonValueKind.Null ? vat.GetInt32() : (int?)null;
            var productDescription = root.TryGetProperty("productDescription", out var pd) ? pd.GetString() : null;

            // Optional client-supplied pricing (use if provided)
            decimal? clientCostPrice = null;
            decimal? clientSellingPrice = null;
            if (root.TryGetProperty("productCostPrice", out var pcp) && pcp.ValueKind != JsonValueKind.Null)
            {
                try { clientCostPrice = pcp.GetDecimal(); } catch { /* ignore parse error */ }
            }
            if (root.TryGetProperty("productSellingPrice", out var psp) && psp.ValueKind != JsonValueKind.Null)
            {
                try { clientSellingPrice = psp.GetDecimal(); } catch { /* ignore parse error */ }
            }

            // Deserialize ingredients as existing DTO type
            var ingredients = Array.Empty<RecipeIngredientDto>();
            if (root.TryGetProperty("ingredients", out var ingArr) && ingArr.ValueKind == JsonValueKind.Array)
            {
                ingredients = JsonSerializer.Deserialize<RecipeIngredientDto[]>(ingArr.GetRawText(), opts) ?? Array.Empty<RecipeIngredientDto>();
            }

            if (string.IsNullOrWhiteSpace(recipeName)) return BadRequest("Recipe name is required.");
            if (ingredients.Length == 0) return BadRequest("Add at least one ingredient.");

            await SetAuditContextUserId();

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delegate the recipe creation logic to the repository
                var recipeId = await _recipeRepository.CreateRecipeAsync(
                    recipeName.Trim(),
                    instructions?.Trim(),
                    user.UserId,
                    resolvedStoreId.Value,
                    ingredients,
                    isOnSale,
                    vatCategoryId,
                    productDescription,
                    clientCostPrice,
                    clientSellingPrice,
                    Request
                );

                await tx.CommitAsync();
                return CreatedAtAction(nameof(GetRecipeWithIngredients), new { recipeId }, new { recipeId });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Failed to create recipe");
                return StatusCode(500, "Failed to create recipe.");
            }
        }

        // PUT api/recipes/{id}
        // Updates an existing recipe with ingredients and optionally product linkage.
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromQuery] int? storeId = null)
        {
            // Parse the payload first
            string? payloadStr = null;
            if (Request.HasFormContentType)
            {
                payloadStr = Request.Form["payload"].FirstOrDefault();
                if (string.IsNullOrWhiteSpace(payloadStr))
                {
                    var jsonFile = Request.Form.Files.FirstOrDefault(f => f.Name.Equals("payload", StringComparison.OrdinalIgnoreCase));
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

            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            UpdateRecipeDto dto;
            try
            {
                dto = JsonSerializer.Deserialize<UpdateRecipeDto>(payloadStr, opts)!;
            }
            catch
            {
                return BadRequest("Invalid payload format.");
            }

            if (dto == null) return BadRequest("Invalid payload.");
            if (dto.RecipeId != id) return BadRequest("Recipe id mismatch.");

            // If storeId was supplied, validate caller is Organization Admin and belongs to same organization as store
            if (storeId.HasValue)
            {
                // Only Organization Admins may specify storeId
                if (!User.IsInRole("Organization Admin"))
                {
                    return Forbid("Only Organization Admins can specify storeId.");
                }

                // Resolve current logged-in user
                var userId = await ResolveUserIdAsync();
                if (!userId.HasValue) return Unauthorized();
                var domainUser = await _userRepository.GetFirstOrDefaultAsync(u => u.UserId == userId.Value);
                if (domainUser == null) return Unauthorized();

                // Validate store exists
                var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreId == storeId.Value);
                if (store == null) return BadRequest("Invalid store ID.");

                // Ensure store belongs to same organization as the logged-in admin
                if (!domainUser.OrgId.HasValue || store.OrgId != domainUser.OrgId)
                {
                    return Forbid("The specified store does not belong to the same organization as the user.");
                }
            }

            await SetAuditContextUserId();

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delegate the recipe update logic to the repository
                await _recipeRepository.UpdateRecipeAsync(
                    id,
                    dto,
                    Request
                );

                await tx.CommitAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Failed to update recipe");
                return StatusCode(500, "Failed to update recipe.");
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
