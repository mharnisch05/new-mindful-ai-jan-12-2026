export function getCorsHeaders(request: Request): Record<string, string> {
  const allowedOrigins = [
    Deno.env.get("ALLOWED_ORIGIN_1") || "https://usemindful.ai",
    Deno.env.get("ALLOWED_ORIGIN_2") || "",
    Deno.env.get("ALLOWED_ORIGIN_3") || "",
  ].filter(Boolean);

  // For development/beta, allow lovable domains
  const origin = request.headers.get("origin") || "";
  const isLovableDomain = origin.includes(".lovable.app") || origin.includes(".lovable.dev");
  const isAllowedOrigin = allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed));

  return {
    "Access-Control-Allow-Origin": (isAllowedOrigin || isLovableDomain) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
