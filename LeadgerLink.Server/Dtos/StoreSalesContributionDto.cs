namespace LeadgerLink.Server.Dtos
{
    public class StoreSalesContributionDto
    {
        public int StoreId { get; set; }
        public string? StoreName { get; set; }
        public decimal TotalSales { get; set; }
        public decimal ContributionPercent { get; set; }
    }
}
