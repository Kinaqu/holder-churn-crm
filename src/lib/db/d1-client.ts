import "server-only";

type D1Param = string | number | boolean | null;

type D1QueryResult<T> = {
  success: boolean;
  results?: T[];
  meta?: {
    last_row_id?: number;
    changes?: number;
  };
};

type D1Envelope<T> = {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: Array<D1QueryResult<T>>;
};

export function hasD1() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_D1_DATABASE_ID && process.env.CLOUDFLARE_D1_API_TOKEN);
}

export async function d1Query<T = Record<string, unknown>>(sql: string, params: D1Param[] = []) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !token) {
    throw new Error("Cloudflare D1 is not configured.");
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store"
  });

  const payload = (await response.json()) as D1Envelope<T>;

  if (!response.ok || !payload.success || !payload.result?.[0]?.success) {
    const message = payload.errors?.map((error) => error.message).join("; ") || `D1 query failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.result[0];
}

export async function d1Batch<T = Record<string, unknown>>(batch: Array<{ sql: string; params?: D1Param[] }>) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !token) {
    throw new Error("Cloudflare D1 is not configured.");
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ batch }),
    cache: "no-store"
  });

  const payload = (await response.json()) as D1Envelope<T>;

  if (!response.ok || !payload.success) {
    const message = payload.errors?.map((error) => error.message).join("; ") || `D1 batch failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.result ?? [];
}
