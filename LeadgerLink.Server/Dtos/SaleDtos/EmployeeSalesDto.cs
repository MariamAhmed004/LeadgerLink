namespace LeadgerLink.Server.Dtos.SaleDtos
{
    public class EmployeeSalesDto
    {
        public int UserId { get; set; }
        public string? FullName { get; set; }
        public int SalesCount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
