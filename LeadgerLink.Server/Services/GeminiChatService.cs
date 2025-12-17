using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LeadgerLink.Server.Services
{
    public class GeminiChatService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        // Use the stable v1 endpoint for better compatibility
        private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

        public GeminiChatService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GEMINI_API_KEY"];
        }

        public async Task<string> SendMessageAsync(string message)
        {
            var payload = new
            {
                contents = new[] { new { parts = new[] { new { text = message } } } }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{BaseUrl}?key={_apiKey}", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"Gemini Error: {response.StatusCode} - {responseBody}");

            var data = JsonSerializer.Deserialize<GeminiApiResponse>(responseBody);

            // Extract the text using null-conditional operators for safety
            return data?.Candidates?[0]?.Content?.Parts?[0]?.Text ?? "No response received.";
        }
    }

    // Simplified Response Models with JSON Mapping
    public class GeminiApiResponse
    {
        [JsonPropertyName("candidates")]
        public Candidate[] Candidates { get; set; }
    }

    public class Candidate
    {
        [JsonPropertyName("content")]
        public Content Content { get; set; }
    }

    public class Content
    {
        [JsonPropertyName("parts")]
        public Part[] Parts { get; set; }
    }

    public class Part
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }
}
