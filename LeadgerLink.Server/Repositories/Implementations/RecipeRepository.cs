using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for recipe-specific queries.
    public class RecipeRepository : Repository<Recipe>, IRecipeRepository
    {
        private readonly LedgerLinkDbContext _context;

        // Constructor requires DbContext.
        public RecipeRepository(LedgerLinkDbContext context) : base(context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        // Return ingredient utilization percentages for a store.
        public async Task<IEnumerable<IngredientUtilizationDto>> GetIngredientUtilizationPercentageAsync(int storeId)
        {
            // Sum quantity per inventory item across recipes that belong to the specified store.
            var itemSums = await _context.RecipeInventoryItems
                .Include(rii => rii.InventoryItem)
                .Include(rii => rii.Recipe)
                .Where(rii => rii.Recipe.StoreId == storeId)
                .GroupBy(rii => new { rii.InventoryItemId, Name = rii.InventoryItem != null ? rii.InventoryItem.InventoryItemName : null })
                .Select(g => new
                {
                    InventoryItemId = g.Key.InventoryItemId,
                    InventoryItemName = g.Key.Name,
                    Quantity = g.Sum(x => x.Quantity)
                })
                .ToListAsync();

            var total = itemSums.Sum(x => x.Quantity);

            if (!itemSums.Any())
                return Array.Empty<IngredientUtilizationDto>();

            return itemSums.Select(x => new IngredientUtilizationDto
            {
                InventoryItemId = x.InventoryItemId,
                InventoryItemName = x.InventoryItemName,
                Quantity = x.Quantity,
                Percentage = total == 0m ? 0m : Math.Round((x.Quantity / total) * 100m, 2)
            });
        }

        // Return the most sold recipe for an organization (by quantity sold).
        public async Task<Recipe> GetMostSoldRecipeByOrganizationAsync(int organizationId)
        {
            var top = await _context.SaleItems
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Include(si => si.Sale)
                .ThenInclude(s => s.Store)
                .Where(si => si.Product != null
                             && si.Product.RecipeId != null
                             && si.Sale.Store.OrgId == organizationId)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, Qty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.Qty)
                .FirstOrDefaultAsync();

            if (top?.RecipeId == null) return null!;

            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                .FirstOrDefaultAsync(r => r.RecipeId == top.RecipeId);
        }

        // Return the most sold recipe for a store (by quantity sold).
        public async Task<Recipe> GetMostSoldRecipeByStoreAsync(int storeId)
        {
            var top = await _context.SaleItems
                .Include(si => si.Product)
                .ThenInclude(p => p.Recipe)
                .Include(si => si.Sale)
                .Where(si => si.Product != null
                             && si.Product.RecipeId != null
                             && si.Sale.StoreId == storeId)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, Qty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.Qty)
                .FirstOrDefaultAsync();

            if (top?.RecipeId == null) return null!;

            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                .FirstOrDefaultAsync(r => r.RecipeId == top.RecipeId);
        }

        // Return recipes for a store.
        public async Task<IEnumerable<Recipe>> GetRecipesByStoreAsync(int storeId)
        {
            return await _context.Recipes
                .Where(r => r.StoreId == storeId)
                .ToListAsync();
        }

        // Return a recipe including its ingredient entries.
        public async Task<Recipe> GetRecipeWithIngredientsAsync(int recipeId)
        {
            return await _context.Recipes
                .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                .FirstOrDefaultAsync(r => r.RecipeId == recipeId);
        }

        // Return detailed recipe DTO including ingredients and related product info.
        public async Task<RecipeDetailDto?> GetDetailByIdAsync(int recipeId)
        {
            var q = _context.Recipes
                .Where(r => r.RecipeId == recipeId)
                .Include(r => r.CreatedByNavigation)
                .Include(r => r.Store)
                .Include(r => r.Products)
                .Include(r => r.RecipeInventoryItems)
                    .ThenInclude(rii => rii.InventoryItem)
                .AsNoTracking();

            var dto = await q.Select(r => new RecipeDetailDto
            {
                RecipeId = r.RecipeId,
                RecipeName = r.RecipeName,
                Description = r.Instructions,
                StoreId = r.StoreId,
                StoreName = r.Store != null ? r.Store.StoreName : null,
                CreatedByName = r.CreatedByNavigation != null ? ((r.CreatedByNavigation.UserFirstname ?? "") + " " + (r.CreatedByNavigation.UserLastname ?? "")).Trim() : null,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                Image = r.Image,
                IsOnSale = r.Products.Any(),
                RelatedProductId = r.Products.FirstOrDefault() != null ? (int?)r.Products.FirstOrDefault()!.ProductId : null,
                Ingredients = r.RecipeInventoryItems.Select(rii => new RecipeIngredientDto
                {
                    RecipeInventoryItemId = rii.RecipeInventoryItemId,
                    InventoryItemId = rii.InventoryItemId,
                    InventoryItemName = rii.InventoryItem != null ? rii.InventoryItem.InventoryItemName : null,
                    Quantity = rii.Quantity
                }).ToList()
            }).FirstOrDefaultAsync();

            return dto;
        }
    }
}