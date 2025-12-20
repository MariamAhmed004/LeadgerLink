using System;
using System.Collections.Generic;

namespace LeadgerLink.Server.Dtos
{
    public class ChartPointDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }

    public class TimeSeriesDto
    {
        public IEnumerable<string> Labels { get; set; } = new List<string>();
        public IEnumerable<decimal> Values { get; set; } = new List<decimal>();
    }

    public class TransferCountsDto
    {
        public int? Outgoing { get; set; }
        public int? Incoming { get; set; }
        public int? Pending { get; set; }
        public int? Completed { get; set; }
    }
}
