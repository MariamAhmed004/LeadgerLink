using System.Collections.Generic;
using System.Threading.Tasks;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Dtos;

namespace LeadgerLink.Server.Repositories.Interfaces
{
    // Repository for sale-specific queries. Inherits common repository operations for Sale.
    public interface ISaleRepository : IRepository<Sale>
    {
        // Get daily sales for the current month for the specified store.
        Task<IEnumerable<DailySalesDto>> GetDailySalesForCurrentMonthAsync(int storeId);

        // Get monthly sales trend for an organization in a given year.
        Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForOrganizationAsync(int organizationId, int year);

        // Get monthly sales trend for a store in a given year.
        Task<IEnumerable<MonthlySalesDto>> GetMonthlySalesTrendForStoreAsync(int storeId, int year);

        // Get sales counts grouped by employee for the specified store.
        Task<IEnumerable<EmployeeSalesDto>> GetSalesCountByEmployeeAsync(int storeId);

        // Get each store's contribution to sales within an organization.
        Task<IEnumerable<StoreSalesContributionDto>> GetStoreSalesContributionAsync(int organizationId);

        // Sum sales for an organization for a specific year and month.
        Task<decimal> SumSalesByMonthForOrganizationAsync(int organizationId, int year, int month);

        // Sum sales for a store for a specific year and month.
        Task<decimal> SumSalesByMonthForStoreAsync(int storeId, int year, int month);

        // Sum sales by recipe for a store for a specific year and month.
        Task<decimal> SumSalesByRecipeAsync(int storeId, int year, int month);

        // Sum sales by recipe for an organization for a specific year and month.
        Task<decimal> SumSalesByRecipeForOrganizationAsync(int organizationId, int year, int month);

        // Sum sales made by a specific user in a store for a given year and month.
        Task<decimal> SumSalesByUserAsync(int userId, int storeId, int year, int month);
    }
}