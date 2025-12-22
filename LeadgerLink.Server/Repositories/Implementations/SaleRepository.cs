using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;
using LeadgerLink.Server.Dtos.RecipeDtos;
using LeadgerLink.Server.Dtos.SaleDtos;
using LeadgerLink.Server.Dtos.StoreDtos;

namespace LeadgerLink.Server.Repositories.Implementations
{
    // Repository for sale-specific queries.
    public class SaleRepository : Repository<Sale>, ISaleRepository
    {
        private readonly LedgerLinkDbContext _context;
        private readonly IInventoryItemRepository inventoryItemRepository;

        public SaleRepository(LedgerLinkDbContext context, IInventoryItemRepository inventoryItemRepository) : base(context)
        {
            _context = context;
            this.inventoryItemRepository = inventoryItemRepository;
        }

        // Daily totals for the current month for a store.
        public async Task<IEnumerable<DailySalesDto>> GetDailySalesForCurrentMonthAsync(int storeId)
        {
            var now = DateTime.UtcNow;
            var year = now.Year;
            var month = now.Month;

            var query = _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .GroupBy(s => s.Timestamp.Day)
                .Select(g => new DailySalesDto
                {
                    Day = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(d => d.Day);

            return await query.ToListAsync();
        }

        // Monthly totals for each month of the provided year for an organization.
        public async Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForOrganizationAsync(int organizationId, int year)
        {
            var query = _context.Sales
                .Where(s => s.Store.OrgId == organizationId && s.Timestamp.Year == year)
                .GroupBy(s => s.Timestamp.Month)
                .Select(g => new MonthlySalesDto
                {
                    Month = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(m => m.Month);

            return await query.ToListAsync();
        }

        // Monthly totals for each month of the provided year for a store.
        public async Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForStoreAsync(int storeId, int year)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year)
                .GroupBy(s => s.Timestamp.Month)
                .Select(g => new MonthlySalesDto
                {
                    Month = g.Key,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .OrderBy(m => m.Month);

            return await query.ToListAsync();
        }

        // Sales counts and totals grouped by employee for a store.
        public async Task<IEnumerable<EmployeeSalesDto>> GetSalesCountByEmployeeAsync(int storeId)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId)
                .GroupBy(s => s.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    SalesCount = g.Count(),
                    Total = g.Sum(s => s.TotalAmount)
                });

            var results = await query.ToListAsync();

            // join with user names
            var userIds = results.Select(r => r.UserId).ToArray();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => $"{u.UserFirstname} {u.UserLastname}");

            return results.Select(r => new EmployeeSalesDto
            {
                UserId = r.UserId,
                FullName = users.TryGetValue(r.UserId, out var name) ? name : null,
                SalesCount = r.SalesCount,
                TotalAmount = r.Total
            }).ToList();
        }

        // Each store's contribution to organization sales.
        public async Task<IEnumerable<StoreSalesContributionDto>> GetStoreSalesContributionAsync(int organizationId)
        {
            var storeSums = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId)
                .GroupBy(s => new { s.StoreId, s.Store.StoreName })
                .Select(g => new
                {
                    StoreId = g.Key.StoreId,
                    StoreName = g.Key.StoreName,
                    Total = g.Sum(s => s.TotalAmount)
                })
                .ToListAsync();

            var totalAll = storeSums.Sum(s => s.Total);

            return storeSums.Select(s => new StoreSalesContributionDto
            {
                StoreId = s.StoreId,
                StoreName = s.StoreName,
                TotalSales = s.Total,
                ContributionPercent = totalAll == 0 ? 0m : Math.Round((s.Total / totalAll) * 100m, 2)
            }).ToList();
        }

        // Sum of sales for an organization for a specific month.
        public async Task<decimal> SumSalesByMonthForOrganizationAsync(int organizationId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.Store.OrgId == organizationId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Sum of sales for a store for a specific month.
        public async Task<decimal> SumSalesByMonthForStoreAsync(int storeId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Sum sales for recipes in a store for a specific month (based on sale items and product selling price).
        public async Task<decimal> SumSalesByRecipeAsync(int storeId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.StoreId == storeId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month
                             && si.Product.RecipeId != null)
                .SumAsync(si => (decimal?)( (si.Product.SellingPrice ?? 0m) * si.Quantity ));

            return sum ?? 0m;
        }

        // Sum sales for recipes across organization for a specific month.
        public async Task<decimal> SumSalesByRecipeForOrganizationAsync(int organizationId, int year, int month)
        {
            var sum = await _context.SaleItems
                .Include(si => si.Product)
                .Include(si => si.Sale)
                .Where(si => si.Sale.Store.OrgId == organizationId
                             && si.Sale.Timestamp.Year == year
                             && si.Sale.Timestamp.Month == month
                             && si.Product.RecipeId != null)
                .SumAsync(si => (decimal?)( (si.Product.SellingPrice ?? 0m) * si.Quantity ));

            return sum ?? 0m;
        }

        // Sum sales by specific user in a store for a given month.
        public async Task<decimal> SumSalesByUserAsync(int userId, int storeId, int year, int month)
        {
            var sum = await _context.Sales
                .Where(s => s.UserId == userId && s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Returns a lightweight list of sales for the specified store.
        public async Task<IEnumerable<SaleListDto>> GetSalesByStoreAsync(int storeId)
        {
            var query = _context.Sales
                .Where(s => s.StoreId == storeId)
                .Include(s => s.User)
                .Include(s => s.PaymentMethod)
                .OrderByDescending(s => s.Timestamp)
                .Select(s => new SaleListDto
                {
                    Id = s.SaleId,
                    Timestamp = s.Timestamp,
                    CreatedById = s.UserId,
                    CreatedByName = (s.User != null)
                        ? ( (s.User.UserFirstname ?? string.Empty).Trim() + " " + (s.User.UserLastname ?? string.Empty).Trim() ).Trim()
                        : null,
                    Amount = s.TotalAmount,
                    PaymentMethodId = s.PaymentMethodId,
                    // best-effort projection for payment method name; may be null depending on model
                    PaymentMethodName = s.PaymentMethod != null ? s.PaymentMethod.PaymentMethodName
                                                                  : null
                });

            return await query.ToListAsync();
        }

        public async Task<IEnumerable<SaleListDto>> GetSalesByOrganizationAsync(int organizationId)
        {
            var query = _context.Sales
                .Where(s => s.Store != null && s.Store.OrgId == organizationId)
                .Include(s => s.User)
                .Include(s => s.PaymentMethod)
                .OrderByDescending(s => s.Timestamp)
                .Select(s => new SaleListDto
                {
                    Id = s.SaleId,
                    Timestamp = s.Timestamp,
                    CreatedById = s.UserId,
                    CreatedByName = (s.User != null)
                        ? ((s.User.UserFirstname ?? string.Empty).Trim() + " " + (s.User.UserLastname ?? string.Empty).Trim()).Trim()
                        : null,
                    Amount = s.TotalAmount,
                    PaymentMethodId = s.PaymentMethodId,
                    PaymentMethodName = s.PaymentMethod != null ? s.PaymentMethod.PaymentMethodName : null,
                    StoreId = s.StoreId,
                    StoreName = s.Store != null ? s.Store.StoreName : null

                });

            return await query.ToListAsync();
        }
        // Sum sales for an organization within an optional date range.
        public async Task<decimal> SumSalesForOrganizationAsync(int organizationId, DateTime? from, DateTime? to)
        {
            var query = _context.Sales
                .Include(s => s.Store)
                .Where(s => s.Store != null && s.Store.OrgId == organizationId);

            // Apply date filters if provided
            if (from.HasValue)
            {
                var fromDate = from.Value.Date;
                query = query.Where(s => s.Timestamp >= fromDate);
            }

            if (to.HasValue)
            {
                var toDate = to.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(s => s.Timestamp <= toDate);
            }

            // Calculate the sum of TotalAmount
            var sum = await query.SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }
        // Sum sales for the current month for a specific store.
        public async Task<decimal> SumSalesForCurrentMonthAsync(int storeId)
        {
            var now = DateTime.UtcNow;
            var year = now.Year;
            var month = now.Month;

            // Query sales for the current month
            var sum = await _context.Sales
                .Where(s => s.StoreId == storeId && s.Timestamp.Year == year && s.Timestamp.Month == month)
                .SumAsync(s => (decimal?)s.TotalAmount);

            return sum ?? 0m;
        }

        // Get the best-selling recipe (by quantity) for a specific store.
        public async Task<BestSellingRecipeDto?> GetBestSellingRecipeForStoreAsync(int storeId)
        {
            // Fetch the top-selling recipe by quantity
            var top = await _context.SaleItems
                .Include(si => si.Sale)
                .Include(si => si.Product)
                .Where(si => si.Sale != null
                             && si.Sale.StoreId == storeId
                             && si.Product != null
                             && si.Product.RecipeId != null)
                .GroupBy(si => si.Product!.RecipeId)
                .Select(g => new { RecipeId = g.Key, TotalQty = g.Sum(si => si.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .FirstOrDefaultAsync();

            if (top == null || top.RecipeId == null)
                return null;

            // Fetch the recipe details
            var recipe = await _context.Recipes
                .Where(r => r.RecipeId == top.RecipeId)
                .Select(r => new BestSellingRecipeDto
                {
                    RecipeId = r.RecipeId,
                    RecipeName = r.RecipeName,
                    TotalQuantity = top.TotalQty
                })
                .FirstOrDefaultAsync();

            return recipe;
        }

        // Create a new sale with items.
        public async Task<int> CreateSaleAsync(CreateSaleDto dto, int storeId, int userId)
        {
            // Step 1: Create the sale
            var sale = new Sale
            {
                Timestamp = dto.Timestamp == default ? DateTime.UtcNow : dto.Timestamp,
                UserId = userId, // always the current logged-in user
                StoreId = storeId,
                TotalAmount = dto.TotalAmount,
                AppliedDiscount = dto.AppliedDiscount,
                PaymentMethodId = dto.PaymentMethodId,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim(),
                CreatedAt = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();

            // Step 2: Insert sale items
            var productQuantities = new List<(int ProductId, decimal Quantity)>();
            foreach (var it in dto.Items!.Where(i => i.Quantity > 0))
            {
                var item = new SaleItem
                {
                    SaleId = sale.SaleId,
                    ProductId = it.ProductId,
                    Quantity = it.Quantity
                };
                _context.SaleItems.Add(item);

                // Collect product quantities for deduction
                productQuantities.Add((it.ProductId, it.Quantity));
            }

            await _context.SaveChangesAsync();

            // Step 3: Separate products into inventory items and recipes
            var productRepository = new ProductRepository(_context);
            var (inventoryItems, recipes) = await productRepository.SeparateProductsAsync(productQuantities);

            // Step 4: Deduct quantities for inventory items and recipes
            var (success, insufficientInventoryItems, insufficientRecipeIngredients) =
                await inventoryItemRepository.DeductQuantitiesAsync(inventoryItems, recipes);

            // Step 5: Handle insufficient stock (optional: log or throw an exception)
            if (!success)
            {
                // Log insufficient stock details or handle as needed
                if (insufficientInventoryItems.Any())
                {
                    Console.WriteLine($"Insufficient Inventory Items: {string.Join(", ", insufficientInventoryItems)}");
                }
                if (insufficientRecipeIngredients.Any())
                {
                    Console.WriteLine($"Insufficient Recipe Ingredients: {string.Join(", ", insufficientRecipeIngredients)}");
                }
            }

            return sale.SaleId;
        }

        // Get sale details by ID, including items and associated data.
        public async Task<SaleDetailDto?> GetSaleByIdAsync(int saleId, int loggedInUserId)
        {
            // Fetch the sale with related data
            var sale = await _context.Sales
                .Include(s => s.PaymentMethod)
                .Include(s => s.Store)
                .Include(s => s.SaleItems)
                    .ThenInclude(si => si.Product)
                .FirstOrDefaultAsync(s => s.SaleId == saleId);

            if (sale == null) return null;

            // Validate that the store's organization matches the logged-in user's organization
            var isValid = await ValidateOrgAssociationAsync(
                loggedInUserId: loggedInUserId,
                storeIds: new[] { sale.StoreId }
            );

            if (!isValid)
            {
                throw new UnauthorizedAccessException("The sale's store does not belong to the same organization as the logged-in user.");
            }

            // Map the sale to the SaleDetailDto
            var dto = new SaleDetailDto
            {
                SaleId = sale.SaleId,
                Timestamp = sale.Timestamp,
                TotalAmount = sale.TotalAmount,
                AppliedDiscount = sale.AppliedDiscount,
                PaymentMethodId = sale.PaymentMethodId,
                PaymentMethodName = sale.PaymentMethod?.PaymentMethodName,
                Notes = sale.Notes,
                CreatedById = sale.UserId,
                CreatedByName = await _context.Users
                    .Where(u => u.UserId == sale.UserId)
                    .Select(u => ((u.UserFirstname ?? "") + " " + (u.UserLastname ?? "")).Trim())
                    .FirstOrDefaultAsync(),
                CreatedAt = sale.CreatedAt,
                UpdatedAt = sale.UpdatedAt,
                StoreId = sale.StoreId,
                SaleItems = sale.SaleItems.Select(si => new SaleItemDetailDto
                {
                    ProductId = si.ProductId,
                    Quantity = si.Quantity,
                    ProductName = si.Product?.ProductName
                }).ToList()
            };

            return dto;
        }

        // Update an existing sale with new details and items.
        public async Task<bool> UpdateSaleAsync(int saleId, CreateSaleDto dto)
        {
            // Fetch the sale by ID
            var sale = await _context.Sales.Include(s => s.SaleItems).FirstOrDefaultAsync(s => s.SaleId == saleId);
            if (sale == null) return false;

            // Update sale details
            sale.Timestamp = dto.Timestamp == default ? sale.Timestamp : dto.Timestamp;
            sale.TotalAmount = dto.TotalAmount;
            sale.AppliedDiscount = dto.AppliedDiscount;
            sale.PaymentMethodId = dto.PaymentMethodId;
            sale.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim();
            sale.UpdatedAt = DateTime.UtcNow.ToString("o");

            // Replace existing sale items with those provided by the client
            _context.SaleItems.RemoveRange(sale.SaleItems);
            foreach (var it in dto.Items!.Where(i => i.Quantity > 0))
            {
                _context.SaleItems.Add(new SaleItem
                {
                    SaleId = sale.SaleId,
                    ProductId = it.ProductId,
                    Quantity = it.Quantity
                });
            }

            // Save changes
            await _context.SaveChangesAsync();
            return true;
        }


        public async Task<bool> ValidateOrgAssociationAsync(
    int loggedInUserId,
    IEnumerable<int>? storeIds = null,
    IEnumerable<int>? userIds = null)
        {
            // Fetch the organization ID of the logged-in user
            var loggedInUserOrgId = await _context.Users
                .Where(u => u.UserId == loggedInUserId)
                .Select(u => u.OrgId)
                .FirstOrDefaultAsync();

            if (!loggedInUserOrgId.HasValue)
            {
                throw new UnauthorizedAccessException("Unable to resolve the logged-in user's organization.");
            }

            // Validate store IDs
            if (storeIds != null && storeIds.Any())
            {
                var storeOrgIds = await _context.Stores
                    .Where(s => storeIds.Contains(s.StoreId))
                    .Select(s => s.OrgId)
                    .Distinct()
                    .ToListAsync();

                // If any store's OrgId does not match the logged-in user's OrgId, return false
                if (storeOrgIds.Any(orgId => orgId != loggedInUserOrgId.Value))
                {
                    return false;
                }
            }

            // Validate user IDs
            if (userIds != null && userIds.Any())
            {
                var userOrgIds = await _context.Users
                    .Where(u => userIds.Contains(u.UserId))
                    .Select(u => u.OrgId)
                    .Distinct()
                    .ToListAsync();

                // If any user's OrgId does not match the logged-in user's OrgId, return false
                if (userOrgIds.Any(orgId => orgId != loggedInUserOrgId.Value))
                {
                    return false;
                }
            }

            // If all validations pass, return true
            return true;
        }

    }
}