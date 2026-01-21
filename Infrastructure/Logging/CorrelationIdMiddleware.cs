using Microsoft.Extensions.Primitives;

namespace InvestindoEmNegocio.Infrastructure.Logging;

public class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-ID";
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreateCorrelationId(context.Request.Headers);
        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (_logger.BeginScope(new Dictionary<string, object>
               {
                   ["CorrelationId"] = correlationId
               }))
        {
            await _next(context);
        }
    }

    private static string GetOrCreateCorrelationId(IHeaderDictionary headers)
    {
        if (headers.TryGetValue(HeaderName, out StringValues values))
        {
            var existing = values.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(existing))
            {
                return existing.Trim();
            }
        }

        return Guid.NewGuid().ToString("N");
    }
}
