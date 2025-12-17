using LeadgerLink.Server.Services;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/gemini")]
public class GeminiController : ControllerBase
{
    private readonly GeminiChatService _geminiChatService;

    public GeminiController(GeminiChatService geminiChatService)
    {
        _geminiChatService = geminiChatService;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] GeminiRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Message cannot be empty.");

        try
        {
            var result = await _geminiChatService.SendMessageAsync(request.Message);
            return Ok(new { response = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
}

public class GeminiRequest
{
    public string Message { get; set; }
}
