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

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/recipes")]
    public class RecipesController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IRecipeRepository _recipeRepository;

        public RecipesController(LedgerLinkDbContext context, IRecipeRepository recipeRepository)
        {
            _context = context;
            _recipeRepository = recipeRepository;
        }

        // GET api/recipes
        // Returns all recipes. Client-side should call this when the user is Organization Admin.
        [HttpGet]
        public async Task<ActionResult> GetAll()
        {
            var list = await _context.Recipes
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .OrderByDescending(r => r.UpdatedAt)
                .Select(r => new RecipeListDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    CreatedById = r.CreatedBy,
                    CreatedByName = r.CreatedByNavigation != null ? (r.CreatedByNavigation.UserFirstname + " " + r.CreatedByNavigation.UserLastname).Trim() : null,
                    StoreId = r.StoreId,
                    StoreName = r.Store != null ? r.Store.StoreName : null,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    InSale = r.Products.Any()
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET api/recipes/for-current-store
        // Returns recipes for the authenticated user's store.
        [Authorize]
        [HttpGet("for-current-store")]
        public async Task<ActionResult> GetForCurrentStore()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return Unauthorized();

            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                        ?? User.Identity?.Name;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower());
            if (user == null || !user.StoreId.HasValue)
                return Ok(Array.Empty<RecipeListDto>());

            var storeId = user.StoreId.Value;

            var list = await _context.Recipes
                .Where(r => r.StoreId == storeId)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .OrderByDescending(r => r.UpdatedAt)
                .Select(r => new RecipeListDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    CreatedById = r.CreatedBy,
                    CreatedByName = r.CreatedByNavigation != null ? (r.CreatedByNavigation.UserFirstname + " " + r.CreatedByNavigation.UserLastname).Trim() : null,
                    StoreId = r.StoreId,
                    StoreName = r.Store != null ? r.Store.StoreName : null,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    InSale = r.Products.Any()
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET api/recipes/ingredient-utilization/{storeId}
        [HttpGet("ingredient-utilization/{storeId}")]
        public async Task<ActionResult<IEnumerable<IngredientUtilizationDto>>> GetIngredientUtilizationPercentage(int storeId)
        {
            var result = await _recipeRepository.GetIngredientUtilizationPercentageAsync(storeId);
            return Ok(result);
        }

        // GET api/recipes/most-sold/organization/{organizationId}
        [HttpGet("most-sold/organization/{organizationId}")]
        public async Task<ActionResult<Recipe>> GetMostSoldRecipeByOrganization(int organizationId)
        {
            var recipe = await _recipeRepository.GetMostSoldRecipeByOrganizationAsync(organizationId);
            if (recipe == null) return NotFound();
            return Ok(recipe);
        }

        // GET api/recipes/most-sold/store/{storeId}
        [HttpGet("most-sold/store/{storeId}")]
        public async Task<ActionResult<Recipe>> GetMostSoldRecipeByStore(int storeId)
        {
            var recipe = await _recipeRepository.GetMostSoldRecipeByStoreAsync(storeId);
            if (recipe == null) return NotFound();
            return Ok(recipe);
        }

        // GET api/recipes/for-store/{storeId}
        [HttpGet("for-store/{storeId}")]
        public async Task<ActionResult<IEnumerable<Recipe>>> GetRecipesByStore(int storeId)
        {
            var recipes = await _recipeRepository.GetRecipesByStoreAsync(storeId);
            return Ok(recipes);
        }

        // GET api/recipes/{recipeId}/with-ingredients
        [HttpGet("{recipeId}/with-ingredients")]
        public async Task<ActionResult> GetRecipeWithIngredients(int recipeId)
        {
            try
            {
                var dto = await _recipeRepository.GetDetailByIdAsync(recipeId);
                if (dto == null) return NotFound();
                return Ok(dto);
            }
            catch (Exception ex)
            {
                // log and return 500
                return StatusCode(500, "Failed to load recipe details");
            }
        }



        [Authorize]
        [HttpPost]
        public async Task<ActionResult> Create()
        {
            var email = User?.Identity?.Name;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email!.ToLower());
            if (user == null || !user.StoreId.HasValue) return BadRequest("Unable to resolve user's store.");

            // Request shape: { recipeName, instructions, isOnSale, vatCategoryId, productDescription, ingredients: RecipeIngredientDto[] }
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

            var recipeName = root.TryGetProperty("recipeName", out var rn) ? rn.GetString() : null;
            var instructions = root.TryGetProperty("instructions", out var instr) ? instr.GetString() : null;
            var isOnSale = root.TryGetProperty("isOnSale", out var ios) && ios.GetBoolean();
            var vatCategoryId = root.TryGetProperty("vatCategoryId", out var vat) && vat.ValueKind != JsonValueKind.Null ? vat.GetInt32() : (int?)null;
            var productDescription = root.TryGetProperty("productDescription", out var pd) ? pd.GetString() : null;

            // Deserialize ingredients as existing DTO type
            var ingredients = Array.Empty<RecipeIngredientDto>();
            if (root.TryGetProperty("ingredients", out var ingArr) && ingArr.ValueKind == JsonValueKind.Array)
            {
                ingredients = JsonSerializer.Deserialize<RecipeIngredientDto[]>(ingArr.GetRawText(), opts) ?? Array.Empty<RecipeIngredientDto>();
            }

            if (string.IsNullOrWhiteSpace(recipeName)) return BadRequest("Recipe name is required.");
            if (ingredients.Length == 0) return BadRequest("Add at least one ingredient.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var recipe = new Recipe
                {
                    RecipeName = recipeName.Trim(),
                    Instructions = string.IsNullOrWhiteSpace(instructions) ? null : instructions.Trim(),
                    CreatedBy = user.UserId,
                    StoreId = user.StoreId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // absorb image from multipart if present
                if (Request.HasFormContentType && Request.Form.Files.Count > 0)
                {
                    var imageFile = Request.Form.Files
                        .FirstOrDefault(f => string.Equals(f.Name, "image", StringComparison.OrdinalIgnoreCase)
                                             || (f.ContentType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) ?? false));
                    if (imageFile != null && imageFile.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        await imageFile.CopyToAsync(ms);
                        recipe.Image = ms.ToArray();
                    }
                }

                _context.Recipes.Add(recipe);
                await _context.SaveChangesAsync();

                // Add ingredients using existing DTO fields
                foreach (var ing in ingredients)
                {
                    // Expect InventoryItemId and Quantity from RecipeIngredientDto; ignore other fields
                    if (!ing.InventoryItemId.HasValue || !ing.Quantity.HasValue || ing.Quantity.Value <= 0) continue;

                    var rii = new RecipeInventoryItem
                    {
                        RecipeId = recipe.RecipeId,
                        InventoryItemId = ing.InventoryItemId.Value,
                        Quantity = ing.Quantity!.Value
                    };
                    _context.RecipeInventoryItems.Add(rii);
                }
                await _context.SaveChangesAsync();

                // If on sale, create product linked to recipe
                if (isOnSale)
                {
                    if (!vatCategoryId.HasValue) return BadRequest("VAT category is required when marking recipe on sale.");

                    var product = new Product
                    {
                        ProductName = recipe.RecipeName,
                        StoreId = user.StoreId!.Value,
                        IsRecipe = true,
                        RecipeId = recipe.RecipeId,
                        InventoryItemId = null,
                        VatCategoryId = vatCategoryId.Value,
                        Description = string.IsNullOrWhiteSpace(productDescription) ? null : productDescription!.Trim(),
                        SellingPrice = 0m,
                        CostPrice = 0m
                    };
                    _context.Products.Add(product);
                    await _context.SaveChangesAsync();
                }

                await tx.CommitAsync();
                return CreatedAtAction(nameof(GetRecipeWithIngredients), new { recipeId = recipe.RecipeId }, new { recipeId = recipe.RecipeId });
            }
            catch
            {
                await tx.RollbackAsync();
                return StatusCode(500, "Failed to create recipe.");
            }
        }
    }
}
