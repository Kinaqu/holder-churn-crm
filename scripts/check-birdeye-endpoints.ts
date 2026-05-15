import "dotenv/config";

type EndpointCheck = {
  name: string;
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, string | number | boolean | undefined>;
};

const baseUrl = process.env.BIRDEYE_BASE_URL ?? "https://public-api.birdeye.so";
const apiKey = process.env.BIRDEYE_API_KEY;
const args = parseArgs(process.argv.slice(2));
const chain = String(args.chain ?? "solana").trim().toLowerCase();
const address = String(args.address ?? args._[0] ?? "").trim();
const limit = clampInt(Number(args.limit ?? 10), 1, 50);

if (!apiKey) {
  console.error("BIRDEYE_API_KEY is required. Set it in .env or the shell environment.");
  process.exit(1);
}

if (!address) {
  console.error("Token mint is required.");
  console.error("Usage: npm run birdeye:check -- --address <SOLANA_TOKEN_MINT>");
  process.exit(1);
}

if (chain !== "solana") {
  console.error(`This diagnostic is for Solana-only Birdeye endpoints. Received chain=${chain}.`);
  process.exit(1);
}

const checks: EndpointCheck[] = [
  {
    name: "Token Holder baseline",
    method: "GET",
    path: "/defi/v3/token/holder",
    query: {
      address,
      offset: 0,
      limit,
      ui_amount_mode: "scaled"
    }
  },
  {
    name: "Token Overview",
    method: "GET",
    path: "/defi/token_overview",
    query: {
      address,
      ui_amount_mode: "scaled"
    }
  },
  {
    name: "Token Metadata",
    method: "GET",
    path: "/defi/v3/token/meta-data/single",
    query: {
      address
    }
  },
  {
    name: "Holder Distribution",
    method: "GET",
    path: "/holder/v1/distribution",
    query: {
      token_address: address,
      address_type: "wallet",
      mode: "top",
      top_n: limit,
      include_list: true,
      offset: 0,
      limit
    }
  },
  {
    name: "Token Transfer",
    method: "POST",
    path: "/token/v1/transfer",
    body: {
      token_address: address,
      limit
    }
  }
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  console.log("Birdeye Solana endpoint diagnostic");
  console.log({ chain, address, limit, baseUrl, package: process.env.BIRDEYE_PACKAGE ?? "standard" });

  for (const check of checks) {
    await runCheck(check);
    await sleep(1_100);
  }
}

async function runCheck(check: EndpointCheck) {
  const startedAt = Date.now();
  const query = compactParams(check.query);
  const body = compactParams(check.body);
  const url = new URL(check.path, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: check.method,
    headers: {
      "X-API-KEY": apiKey!,
      "x-chain": chain,
      accept: "application/json",
      ...(check.method === "POST" ? { "content-type": "application/json" } : {})
    },
    body: check.method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  const parsed = safeJson(text);
  const itemsCount = countItems(parsed);
  const firstItems = firstObjects(parsed, 5);

  console.log("");
  console.log(check.name);
  console.log({
    method: check.method,
    path: check.path,
    status: response.status,
    ok: response.ok,
    durationMs,
    headers: diagnosticHeaders(response.headers),
    topLevelKeys: objectKeys(parsed),
    dataKeys: objectKeys(dataObject(parsed)),
    candidateFields: candidateFieldReport(parsed),
    itemsCount,
    firstItemKeys: firstItems.map((item) => Object.keys(item)),
    firstItemCandidates: firstItems.map(candidateFieldReport),
    bodyPreview: sanitize(text).slice(0, 1_000)
  });
}

function compactParams(params: EndpointCheck["query"] = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)])
  );
}

function diagnosticHeaders(headers: Headers) {
  const interestingHeaders = ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "cf-ray"];
  return Object.fromEntries(interestingHeaders.map((header) => [header, headers.get(header)]).filter(([, value]) => value));
}

function countItems(value: unknown): number | undefined {
  const arrays = findArrays(value);
  const firstArray = arrays[0];
  return firstArray ? firstArray.length : undefined;
}

function firstObjects(value: unknown, limit: number): Record<string, unknown>[] {
  const arrays = findArrays(value);
  const firstArray = arrays[0];
  if (!firstArray) return [];
  return firstArray.filter(isRecord).slice(0, limit);
}

function findArrays(value: unknown): unknown[][] {
  if (Array.isArray(value)) return [value];
  if (!value || typeof value !== "object") return [];

  return Object.values(value as Record<string, unknown>).flatMap(findArrays);
}

function candidateFieldReport(value: unknown) {
  const record = dataObject(value) ?? (isRecord(value) ? value : {});
  return {
    identity: pick(record, ["symbol", "tokenSymbol", "token_symbol", "name", "tokenName", "token_name", "decimals", "decimal"]),
    totals: pick(record, ["holderCount", "holder_count", "holdersCount", "totalHolders", "total_holders", "total", "supply", "totalSupply", "total_supply", "circulating_supply"]),
    concentration: pick(record, ["top10", "top10SupplyPercent", "top10HolderPercent", "top_10_supply_percent", "top50", "top50SupplyPercent", "top50HolderPercent", "top_50_supply_percent"]),
    wallet: pick(record, ["owner", "ownerAddress", "owner_address", "wallet", "walletAddress", "wallet_address", "address", "holder", "holderAddress", "tokenAccount", "tokenAccountAddress", "token_account", "account", "accountAddress"]),
    percent: pick(record, ["percentage", "supplyPercent", "supply_percent", "percent", "pct", "ownerPercentage", "amountPercentage", "uiAmountPercentage", "share", "ratio"]),
    balance: pick(record, ["uiAmount", "ui_amount", "balance", "amount", "valueUsd", "value_usd"])
  };
}

function dataObject(value: unknown) {
  if (!isRecord(value)) return undefined;
  return isRecord(value.data) ? value.data : value;
}

function objectKeys(value: unknown) {
  return isRecord(value) ? Object.keys(value) : [];
}

function pick(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => record[key] !== undefined).map((key) => [key, record[key]]));
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function sanitize(text: string) {
  return apiKey ? text.replaceAll(apiKey, "[redacted]") : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isInteger(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(values: string[]) {
  const parsed: Record<string, string | boolean | string[]> & { _: string[] } = { _: [] };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}
