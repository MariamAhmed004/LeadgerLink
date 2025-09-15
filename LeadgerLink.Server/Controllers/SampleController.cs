using Microsoft.AspNetCore.Mvc;

namespace LeadgerLink.Server.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SampleController : ControllerBase // Fix: Inherit from ControllerBase to use Content method
    {
        [HttpGet("Hello")]
        public IActionResult GetHello()
        {
            return Content("Hello, World from the backend c sharp method"); // Content method is now accessible
        }
    }
}
