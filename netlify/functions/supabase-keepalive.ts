declare const Netlify: {
  env: {
    get(name: string): string | undefined;
  };
};

const KEEPALIVE_SCHEMA = 'linergy_keepalive';
const REQUEST_TIMEOUT_MS = 10_000;

function requiredEnvironmentVariable(name: string): string {
  const value = Netlify.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function runSupabaseKeepalive(
  supabaseUrl: string,
  publicKey: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/ping`,
      {
        method: 'POST',
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${publicKey}`,
          'Content-Type': 'application/json',
          'Content-Profile': KEEPALIVE_SCHEMA,
        },
        body: '{}',
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase keepalive failed with HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();

    if (payload !== true) {
      throw new Error('Supabase keepalive returned an unexpected response');
    }
  } finally {
    clearTimeout(timeout);
  }
}

export default async (): Promise<Response> => {
  await runSupabaseKeepalive(
    requiredEnvironmentVariable('VITE_SUPABASE_URL'),
    requiredEnvironmentVariable('VITE_SUPABASE_ANON_KEY'),
  );

  console.log('Supabase keepalive completed');

  return new Response(null, { status: 204 });
};

export const config = {
  // Netlify schedules use UTC. This runs three times per day, away from :00.
  schedule: '17 */8 * * *',
};
