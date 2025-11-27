using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LeadgerLink.Server.Models;
using LeadgerLink.Server.Repositories.Interfaces;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly IRepository<Notification> _repo;

        public NotificationsController(IRepository<Notification> repo)
        {
            _repo = repo;
        }

        // GET api/notifications/latest?organizationId=5&pageSize=5
        [HttpGet("latest")]
        public async Task<IActionResult> GetLatest([FromQuery] int pageSize = 5)
        {
            const int MaxPageSize = 50;
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize); // default 5, cap at MaxPageSize

            var items = await _repo.GetWhereAsync(n => true); // adjust predicate as needed (current user)
            var ordered = items.OrderByDescending(n => n.CreatedAt).Take(pageSize);
            return Ok(ordered);
        }
    }
}