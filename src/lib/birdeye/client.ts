import "server-only";

import { BIRDEYE_ENDPOINTS, assertAllowedEndpoint, type BirdeyeEndpointName } from "@/lib/birdeye/endpoints";
import type { BirdeyeSource } from "@/lib/types";
import {
  normalizeDistribution,
  normalizePriceStats,
  normalizeTransfers,
  normalizeWalletCurrentNetWorth,
  type NormalizedHolderDistribution,
  type NormalizedPriceStats,
  type NormalizedTokenTransfer,
  type NormalizedWalletCurrentNetWorth
} from "@/lib/birdeye/normalizers";

export type BirdeyeResult<T> =
  | {
      ok: true;
      data: T;
      statusCode: number;
      cacheHit: boolean;
      durationMs: number;
      calls: number;
      endpoint: BirdeyeEndpointName;
      sourceLabel: BirdeyeSource;
    }
  | {
      ok: false;
      error: string;
      statusCode?: number;
      cacheHit: boolean;
      durationMs: number;
      calls: number;
      retryAfterMs?: number;
      endpoint: BirdeyeEndpointName;
      sourceLabel: BirdeyeSource;
    };

type Usage = {
  calls: number;
  cacheHits: number;
  cacheMisses: number;
};

type RequestOptions = {
  chain: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, string | number | boolean | undefined>;
};

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

const memoryCache = new Map<string, CacheEntry>();
const requestBuckets = new Map<string, number[]>();

export function getBirdeyeClient() {
  return new BirdeyeClient();
}

class BirdeyeClient {
  readonly usage: Usage = { calls: 0, cacheHits: 0, cacheMisses: 0 };
  private readonly baseUrl = "https://public-api.birdeye.so";
  private readonly apiKey = process.env.BIRDEYE_API_KEY;

  async getTokenHolders(chain: string, tokenAddress: string, limit = 300, offset = 0) {
    return this.request<unknown>("tokenHolders", {
      chain,
      query: {
        address: tokenAddress,
        offset,
        limit: Math.min(limit, 100),
        ui_amount_mode: "scaled"
      }
    });
  }

  async getHolderDistribution(chain: string, tokenAddress: string, options: { topN?: number; includeList?: boolean } = {}): Promise<BirdeyeResult<NormalizedHolderDistribution>> {
    const result = await this.request<unknown>("holderDistribution", {
      chain,
      query: {
        token_address: tokenAddress,
        address_type: "wallet",
        mode: "top",
        top_n: options.topN ?? 50,
        include_list: options.includeList ?? true,
        offset: 0,
        limit: 50
      }
    });
    return result.ok ? { ...result, data: normalizeDistribution(result.data) } : result;
  }

  async getPriceStats(chain: string, tokenAddress: string): Promise<BirdeyeResult<NormalizedPriceStats>> {
    const result = await this.request<unknown>("priceStats", {
      chain,
      query: {
        address: tokenAddress,
        list_timeframe: "24h",
        ui_amount_mode: "scaled"
      }
    });
    return result.ok ? { ...result, data: normalizePriceStats(result.data) } : result;
  }

  async getTokenSecurity(chain: string, tokenAddress: string) {
    return this.request<unknown>("tokenSecurity", {
      chain,
      query: { address: tokenAddress }
    });
  }

  async getTokenTransfers(chain: string, tokenAddress: string, options: { limit?: number; timeFrom?: number; timeTo?: number } = {}): Promise<BirdeyeResult<NormalizedTokenTransfer[]>> {
    const result = await this.request<unknown>("tokenTransfers", {
      chain,
      body: {
        token_address: tokenAddress,
        limit: Math.min(options.limit ?? defaultTransferLimit(), defaultTransferLimit()),
        time_from: options.timeFrom,
        time_to: options.timeTo
      }
    });
    return result.ok ? { ...result, data: normalizeTransfers(result.data) } : result;
  }

  async getWalletCurrentNetWorth(chain: string, walletAddress: string): Promise<BirdeyeResult<NormalizedWalletCurrentNetWorth>> {
    const result = await this.request<unknown>("walletCurrentNetWorth", {
      chain,
      query: {
        wallet: walletAddress,
        sort_by: "value",
        sort_type: "desc",
        limit: 20,
        offset: 0
      }
    });
    return result.ok ? { ...result, data: normalizeWalletCurrentNetWorth(result.data, walletAddress) } : result;
  }

  async getWalletNetWorth(chain: string, walletAddress: string, options: { count?: number; type?: "1h" | "1d" } = {}) {
    return this.request<unknown>("walletNetWorth", {
      chain,
      query: {
        wallet: walletAddress,
        count: Math.min(options.count ?? 7, 30),
        direction: "back",
        type: options.type ?? "1d",
        sort_type: "desc"
      }
    });
  }

  async getWalletBalanceChange(chain: string, walletAddress: string, options: { days?: number } = {}) {
    return this.request<unknown>("walletBalanceChange", {
      chain,
      query: {
        wallet: walletAddress,
        days: options.days ?? 7
      }
    });
  }

  async getHolderProfile(chain: string, tokenAddress: string, walletAddress: string) {
    return this.request<unknown>("holderProfile", {
      chain,
      query: {
        address: tokenAddress,
        wallet: walletAddress
      }
    });
  }

  async getHolderPositions(chain: string, tokenAddress: string, walletAddress: string) {
    return this.request<unknown>("holderPositions", {
      chain,
      query: {
        address: tokenAddress,
        wallet: walletAddress
      }
    });
  }

  private async request<T>(name: BirdeyeEndpointName, options: RequestOptions): Promise<BirdeyeResult<T>> {
    const endpoint = assertAllowedEndpoint(name);
    const startedAt = Date.now();
    const query = compactParams(options.query);
    const body = compactParams(options.body);
    const validation = validateParams({ ...query, ...body });

    if (!validation.ok) {
      return failure(name, validation.error, Date.now() - startedAt);
    }

    if (!this.apiKey) {
      return failure(name, "BIRDEYE_API_KEY is not configured.", Date.now() - startedAt);
    }

    const chain = normalizeChain(options.chain);
    const cacheKey = `${name}:${chain}:${stableStringify(query)}:${stableStringify(body)}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.usage.cacheHits += 1;
      return {
        ok: true,
        data: cached.data as T,
        statusCode: 200,
        cacheHit: true,
        durationMs: Date.now() - startedAt,
        calls: 0,
        endpoint: name,
        sourceLabel: endpoint.label
      };
    }

    this.usage.cacheMisses += 1;
    const url = new URL(endpoint.path, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    let calls = 0;
    const maxAttempts = 3;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const rateLimit = await reserveRequestBudget(endpoint.walletRateLimit ? "wallet" : "account");
        if (!rateLimit.ok) {
          return failure(name, rateLimit.error, Date.now() - startedAt, undefined, calls);
        }

        calls += 1;
        this.usage.calls += 1;
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            "X-API-KEY": this.apiKey,
            "x-chain": chain,
            accept: "application/json",
            ...(endpoint.method === "POST" ? { "content-type": "application/json" } : {})
          },
          body: endpoint.method === "POST" ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(9_000),
          cache: "no-store"
        });

        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
          const responseBody = sanitizeError(await response.text());
          const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
          logBirdeyeFailure({
            name,
            path: endpoint.path,
            status: response.status,
            attempt,
            maxAttempts,
            durationMs,
            headers: diagnosticHeaders(response.headers),
            body: responseBody
          });

          if (response.status === 429 && attempt < maxAttempts) {
            await sleep(retryAfterMs ?? retryDelayMs(name, attempt));
            continue;
          }

          return failure(name, `Birdeye ${BIRDEYE_ENDPOINTS[name].label} returned ${response.status}.${statusHint(response.status)}`, durationMs, response.status, calls, retryAfterMs);
        }

        const data = (await response.json()) as T;
        memoryCache.set(cacheKey, { data, expiresAt: Date.now() + endpoint.ttlSeconds * 1000 });
        return {
          ok: true,
          data,
          statusCode: response.status,
          cacheHit: false,
          durationMs,
          calls,
          endpoint: name,
          sourceLabel: endpoint.label
        };
      }
    } catch (error) {
      return failure(name, error instanceof Error ? sanitizeError(error.message) : "Birdeye request failed.", Date.now() - startedAt, undefined, calls);
    }

    return failure(name, "Birdeye request failed after retries.", Date.now() - startedAt, undefined, calls);
  }
}

function failure(name: BirdeyeEndpointName, error: string, durationMs: number, statusCode?: number, calls = 0, retryAfterMs?: number): BirdeyeResult<never> {
  return {
    ok: false,
    endpoint: name,
    sourceLabel: BIRDEYE_ENDPOINTS[name].label,
    statusCode,
    error,
    cacheHit: false,
    durationMs,
    calls,
    retryAfterMs
  };
}

function compactParams(params: RequestOptions["query"] = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)])
  );
}

function validateParams(params: Record<string, string>) {
  for (const [key, value] of Object.entries(params)) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) return { ok: false as const, error: "Invalid Birdeye request param key." };
    if (value.length > 180) return { ok: false as const, error: "Invalid Birdeye request param length." };
  }
  return { ok: true as const };
}

async function reserveRequestBudget(bucketName: "account" | "wallet") {
  const rpmLimit = bucketName === "wallet" ? envInt("BIRDEYE_WALLET_RPM", 30) : envInt("BIRDEYE_ACCOUNT_RPM", 50);
  const rpsLimit = bucketName === "wallet" ? envInt("BIRDEYE_WALLET_RPS", 5) : envInt("BIRDEYE_ACCOUNT_RPS", 1);

  await reserveLocalWindowBudget(`${bucketName}:rps`, rpsLimit, 1_000);

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return reserveUpstashBudget(bucketName, rpmLimit);
  }

  const reserved = await reserveLocalWindowBudget(`${bucketName}:rpm`, rpmLimit, 60_000, false);
  if (!reserved) return { ok: false as const, error: `Safe Birdeye ${bucketName} rate limit reached: ${rpmLimit} requests/minute.` };
  return { ok: true as const };
}

async function reserveLocalWindowBudget(key: string, limit: number, windowMs: number, wait = true): Promise<boolean> {
  while (true) {
    const now = Date.now();
    const bucket = (requestBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (bucket.length < limit) {
      bucket.push(now);
      requestBuckets.set(key, bucket);
      return true;
    }

    if (!wait) {
      requestBuckets.set(key, bucket);
      return false;
    }

    const delayMs = Math.max(1, windowMs - (now - bucket[0]));
    await sleep(delayMs);
  }
}

async function reserveUpstashBudget(bucketName: "account" | "wallet", limit: number) {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const key = `birdeye:${bucketName}:rpm:${Math.floor(Date.now() / 60_000)}`;
  const response = await fetch(`${baseUrl}/incr/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const payload = (await response.json()) as { result?: number };
  if ((payload.result ?? 0) === 1) {
    await fetch(`${baseUrl}/expire/${key}/65`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
  }
  if ((payload.result ?? 0) > limit) return { ok: false as const, error: `Safe Birdeye ${bucketName} rate limit reached: ${limit} requests/minute.` };
  return { ok: true as const };
}

function stableStringify(value: Record<string, string>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function defaultTransferLimit() {
  return birdeyePackageLabel() === "standard" ? 10 : 50;
}

function birdeyePackageLabel() {
  return String(process.env.BIRDEYE_PACKAGE ?? "standard").trim().toLowerCase();
}

function normalizeChain(chain: string) {
  return chain.trim().toLowerCase();
}

function retryDelayMs(name: BirdeyeEndpointName, attempt: number) {
  if (name === "tokenTransfers") return attempt * 10_000;
  if (name === "holderDistribution") return attempt * 5_000;
  return attempt * 1_500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), 10_000);

  const resetAt = Date.parse(value);
  if (Number.isNaN(resetAt)) return undefined;
  return Math.min(Math.max(resetAt - Date.now(), 0), 10_000);
}

function diagnosticHeaders(headers: Headers) {
  const interestingHeaders = ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "cf-ray"];
  return Object.fromEntries(interestingHeaders.map((header) => [header, headers.get(header)]).filter(([, value]) => value));
}

function logBirdeyeFailure(input: {
  name: BirdeyeEndpointName;
  path: string;
  status: number;
  attempt: number;
  maxAttempts: number;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}) {
  console.warn("Birdeye request failed", {
    endpoint: input.name,
    path: input.path,
    status: input.status,
    attempt: input.attempt,
    maxAttempts: input.maxAttempts,
    durationMs: input.durationMs,
    headers: input.headers,
    body: input.body.slice(0, 500)
  });
}

function statusHint(status: number) {
  if (status === 401) return " Check the API key and whether this key is authorized for the endpoint.";
  if (status === 403) return " The request is forbidden or this endpoint is not enabled for the key/package.";
  if (status === 429) return " Birdeye account rate limit reached; lower BIRDEYE_ACCOUNT_RPS/RPM or retry later.";
  return "";
}

function sanitizeError(message: string) {
  const key = process.env.BIRDEYE_API_KEY;
  return key ? message.replaceAll(key, "[redacted]") : message;
}
