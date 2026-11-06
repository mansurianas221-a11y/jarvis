/**
 * Jarvis — health probe.
 *
 * Useful for uptime checks and for the app to verify the backend is reachable.
 * Deliberately exposes no secrets: only booleans and the model name.
 */

function env(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(): Promise<Response> {
  const configured = env('AI_API_KEY').length > 0;
  const secured = env('AI_ROUTE_SECRET').length > 0;

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'jarvis-ai',
      version: '1.0.0',
      configured,
      secured,
      model: env('AI_MODEL') || 'gpt-4o-mini',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}
