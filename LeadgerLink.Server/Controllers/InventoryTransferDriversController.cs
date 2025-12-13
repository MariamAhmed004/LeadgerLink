using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    // New lightweight controller to expose drivers scoped to a store
    // Route sits under /api/inventorytransfers to keep related endpoints together.
    [ApiController]
    [Route("api/inventorytransfers")]
    public class InventoryTransferDriversController : ControllerBase
    {
        private readonly IRepository<Driver> _driverRepository;
        private readonly ILogger<InventoryTransferDriversController> _logger;

        public InventoryTransferDriversController(IRepository<Driver> driverRepository, ILogger<InventoryTransferDriversController> logger)
        {
            _driverRepository = driverRepository ?? throw new ArgumentNullException(nameof(driverRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // GET: api/inventorytransfers/drivers/by-store/{storeId}
        // Uses the generic repository to fetch drivers, then filters by storeId server-side.
        // Returns driver id, name and email so client can show name in selects and display email when chosen.
        [HttpGet("drivers/by-store/{storeId:int}")]
        public async Task<ActionResult<IEnumerable<object>>> GetDriversByStore(int storeId)
        {
            try
            {
                var all = await _driverRepository.GetAllAsync();
                var filtered = (all ?? Array.Empty<Driver>())
                    .Where(d => d.StoreId.HasValue && d.StoreId.Value == storeId)
                    .Select(d => new
                    {
                        driverId = d.DriverId,
                        driverName = d.DriverName,
                        driverEmail = d.DriverEmail,
                        storeId = d.StoreId
                    })
                    .ToList();

                return Ok(filtered);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load drivers for store {StoreId}", storeId);
                return StatusCode(500, "Failed to load drivers");
            }
        }
    }
}