using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/products")]
    public class ProductsController : ControllerBase
    {
        private readonly LedgerLinkDbContext _context;

        public ProductsController(LedgerLinkDbContext context)
        {
            _context = context;
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

            // Eagerly load related inventory item and recipe -> recipe ingredients -> ingredient inventory item
            var products = await _context.Products
                .Include(p => p.InventoryItem)
                .Include(p => p.Recipe)
                    .ThenInclude(r => r.RecipeInventoryItems)
                        .ThenInclude(rii => rii.InventoryItem)
                .Where(p => p.StoreId == storeId)
                .OrderBy(p => p.ProductName)
                .ToListAsync();

            var list = products.Select(p =>
            {
                var dto = new ProductListDto
                {
                    ProductId = p.ProductId,
                    ProductName = p.ProductName,
                    SellingPrice = p.SellingPrice,
                    InventoryItemId = p.InventoryItemId,
                    RecipeId = p.RecipeId
                };

                if (p.InventoryItemId.HasValue)
                {
                    dto.Source = "InventoryItem";
                    var ii = p.InventoryItem;
                    dto.IsAvailable = ii != null && ii.Quantity > 0m;
                    dto.AvailabilityMessage = dto.IsAvailable ? "Available" : "Out of stock";
                }
                else if (p.RecipeId.HasValue)
                {
                    dto.Source = "Recipe";
                    var recipe = p.Recipe;
                    if (recipe == null || recipe.RecipeInventoryItems == null || !recipe.RecipeInventoryItems.Any())
                    {
                        dto.IsAvailable = false;
                        dto.AvailabilityMessage = "Recipe or ingredients not found";
                    }
                    else
                    {
                        // Check each ingredient quantity against the inventory item quantity
                        string? missing = null;
                        foreach (var rii in recipe.RecipeInventoryItems)
                        {
                            var ingredient = rii.InventoryItem;
                            // If ingredient record missing or insufficient quantity mark unavailable and note which
                            if (ingredient == null)
                            {
                                missing = $"Missing ingredient (id:{rii.InventoryItemId})";
                                break;
                            }

                            // required quantity per recipe entry
                            var requiredQty = rii.Quantity;
                            if (ingredient.Quantity < requiredQty)
                            {
                                missing = ingredient.InventoryItemName ?? $"Ingredient {rii.InventoryItemId} low";
                                break;
                            }
                        }

                        dto.IsAvailable = string.IsNullOrEmpty(missing);
                        dto.AvailabilityMessage = dto.IsAvailable ? "Available" : $"Unavailable: {missing}";
                    }
                }
                else
                {
                    dto.Source = "Unknown";
                    dto.IsAvailable = false;
                    dto.AvailabilityMessage = "No source";
                }

                return dto;
            }).ToList();

            return Ok(list);
        }
    }
}
