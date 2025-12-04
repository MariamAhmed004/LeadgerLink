using System;
using System.Collections.Generic;
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
    }
}
