using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/inventorytransfers")]
    public class InventoryTransfersController : ControllerBase
    {
        private readonly IInventoryTransferRepository _repository;
        private readonly ILogger<InventoryTransfersController> _logger;

        public InventoryTransfersController(IInventoryTransferRepository repository, ILogger<InventoryTransfersController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // GET api/inventorytransfers/count?organizationId=5&from=2025-11-27&to=2025-11-27
        [HttpGet("count")]
        public async Task<ActionResult<int>> Count([FromQuery] int organizationId, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                var c = await _repository.CountTransfersByOrganizationAsync(organizationId, from, to);
                return Ok(c);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to count inventory transfers");
                return StatusCode(500, "Failed to count inventory transfers");
            }
        }
    }
}