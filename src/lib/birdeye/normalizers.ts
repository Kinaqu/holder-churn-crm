import type { HolderSnapshot } from "@/lib/types";

type AnyRecord = Record<string, unknown>;

export type NormalizedHolderDistribution = {
  top10SupplyPercent?: number;
  top50SupplyPercent?: number;
  holderCount?: number;
  totalSupply?: number;
};

export type NormalizedHolderPayload = {
  holders: HolderSnapshot[];
  holderCount?: number;
  totalSupply?: number;
  unresolvedHolders: number;
};

export type NormalizedPriceStats = {
  priceUsd: number;
  priceChange24h: number;
};

export type NormalizedTokenContext = {
  symbol?: string;
  name?: string;
  decimals?: number;
  holderCount?: number;
  totalSupply?: number;
  top10SupplyPercent?: number;
  top50SupplyPercent?: number;
};

export type NormalizedTokenTransfer = {
  txHash: string;
  fromWallet?: string;
  toWallet?: string;
  amount?: number;
  valueUsd?: number;
  blockUnixTime?: number;
};

export type NormalizedWalletCurrentNetWorth = {
  walletAddress: string;
  netWorthUsd: number;
};

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function normalizeHolders(raw: unknown, options: { chain?: string; totalSupply?: number } = {}): HolderSnapshot[] {
  return normalizeHolderPayload(raw, options).holders;
}

export function normalizeHolderPayload(raw: unknown, options: { chain?: string; totalSupply?: number } = {}): NormalizedHolderPayload {
  const items = extractArray(raw);
  const now = new Date().toISOString();
  const payloadTotalSupply = options.totalSupply ?? extractTotalSupply(raw);
  const holderCount = extractHolderCount(raw);
  let unresolvedHolders = 0;

  const holders = items.slice(0, 500).flatMap((item, index) => {
    const walletAddress = addressFrom(item, walletAddressPaths(), options.chain);
    const tokenAccountAddress = addressFrom(item, tokenAccountAddressPaths(), options.chain);
    const displayAddress = walletAddress ?? tokenAccountAddress;

    if (!displayAddress) {
      unresolvedHolders += 1;
      return [];
    }

    const balance = numberFromPath(item, balancePaths()) ?? 0;
    const rawSupplyPercent = numberFromPath(item, percentPaths());
    const supplyPercent = normalizePercentValue(rawSupplyPercent) ?? percentFromBalance(balance, payloadTotalSupply);
    const balanceUsd = numberFromPath(item, ["valueUsd", "value_usd", "balanceUsd", "usdValue", "value", "usd_value"]) ?? 0;

    return [
      {
        walletAddress: displayAddress,
        tokenAccountAddress,
        addressType: walletAddress ? ("wallet" as const) : tokenAccountAddress ? ("token_account" as const) : ("unknown" as const),
        balance,
        balanceUsd,
        supplyPercent,
        holderRank: index + 1,
        snapshotAt: now,
        sourceEndpoint: "Token Holder" as const
      }
    ];
  });

  return {
    holders,
    holderCount,
    totalSupply: payloadTotalSupply,
    unresolvedHolders
  };
}

export function normalizeDistribution(raw: unknown): NormalizedHolderDistribution {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  const holders = extractArray(raw);

  const top10SupplyPercent =
    normalizePercentValue(numberFromPath(data, ["top10", "top10SupplyPercent", "top10HolderPercent", "top_10_supply_percent", "top10HolderSupplyPercent", "top10Percent"])) ??
    sumHolderPercent(holders.slice(0, 10));
  const top50SupplyPercent =
    normalizePercentValue(numberFromPath(data, ["top50", "top50SupplyPercent", "top50HolderPercent", "top_50_supply_percent", "top50HolderSupplyPercent", "top50Percent"])) ??
    sumHolderPercent(holders.slice(0, 50));

  return {
    top10SupplyPercent,
    top50SupplyPercent,
    holderCount: extractHolderCount(raw),
    totalSupply: extractTotalSupply(raw)
  };
}

export function normalizePriceStats(raw: unknown): NormalizedPriceStats {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  const frame24h = asRecord(data["24h"]) ?? asRecord(asRecord(data.items)?.["24h"]);

  return {
    priceUsd: numberFromPath(data, ["price", "priceUsd", "value", "current"]) ?? numberFromPath(frame24h ?? {}, ["price", "current"]) ?? 0,
    priceChange24h:
      numberFromPath(data, ["priceChange24h", "change24h", "priceChangePercent24h"]) ??
      numberFromPath(frame24h ?? {}, ["priceChangePercent", "price_change_percent", "changePercent"]) ??
      0
  };
}

export function normalizeTokenContext(raw: unknown): NormalizedTokenContext {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;

  return {
    symbol: stringFromPath(data, ["symbol", "tokenSymbol", "token_symbol"]),
    name: stringFromPath(data, ["name", "tokenName", "token_name"]),
    decimals: numberFromPath(data, ["decimals", "decimal"]),
    holderCount: extractHolderCount(raw),
    totalSupply: extractTotalSupply(raw),
    top10SupplyPercent: normalizePercentValue(numberFromPath(data, ["top10", "top10SupplyPercent", "top10HolderPercent", "top_10_supply_percent", "top10HolderSupplyPercent", "top10Percent"])),
    top50SupplyPercent: normalizePercentValue(numberFromPath(data, ["top50", "top50SupplyPercent", "top50HolderPercent", "top_50_supply_percent", "top50HolderSupplyPercent", "top50Percent"]))
  };
}

export function normalizeTransfers(raw: unknown): NormalizedTokenTransfer[] {
  return extractArray(raw).map((item, index) => ({
    txHash: stringFromPath(item, ["tx_hash", "txHash", "signature", "hash"]) ?? `unknown-transfer-${index}`,
    fromWallet: stringFromPath(item, ["from_wallet", "fromWallet", "from"]),
    toWallet: stringFromPath(item, ["to_wallet", "toWallet", "to"]),
    amount: numberFromPath(item, ["amount", "ui_amount", "uiAmount"]),
    valueUsd: numberFromPath(item, ["value", "valueUsd", "value_usd"]),
    blockUnixTime: numberFromPath(item, ["block_unix_time", "blockUnixTime", "timestamp"])
  }));
}

export function normalizeWalletCurrentNetWorth(raw: unknown, walletAddress: string): NormalizedWalletCurrentNetWorth {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  return {
    walletAddress,
    netWorthUsd: numberFromPath(data, ["netWorth", "netWorthUsd", "totalUsd", "totalValue", "value"]) ?? 0
  };
}

function extractHolderCount(raw: unknown) {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  return numberFromPath(data, [
    "holderCount",
    "holder_count",
    "holdersCount",
    "holders_count",
    "totalHolders",
    "total_holders",
    "uniqueHolders",
    "unique_holders",
    "total"
  ]);
}

function extractTotalSupply(raw: unknown) {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  return numberFromPath(data, [
    "supply",
    "totalSupply",
    "total_supply",
    "tokenSupply",
    "token_supply",
    "circulatingSupply",
    "circulating_supply"
  ]);
}

function extractArray(raw: unknown): AnyRecord[] {
  const record = asRecord(raw);
  if (!record) return [];
  const data = asRecord(record.data);
  const nestedData = asRecord(data?.data);
  const candidates = [
    data?.items,
    data?.holders,
    data?.list,
    data?.data,
    nestedData?.items,
    nestedData?.holders,
    nestedData?.list,
    record.items,
    record.holders,
    record.list,
    record.data,
    data?.transfers,
    data?.txs,
    record.transfers,
    record.txs
  ];
  const array = candidates.find(Array.isArray);
  return Array.isArray(array) ? array.filter(isRecord) : [];
}

function sumHolderPercent(holders: AnyRecord[]) {
  const values = holders.map((holder) => normalizePercentValue(numberFromPath(holder, percentPaths()))).filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0);
}

function percentFromBalance(balance: number, totalSupply?: number) {
  if (!totalSupply || totalSupply <= 0) return undefined;
  return (balance / totalSupply) * 100;
}

function normalizePercentValue(value?: number) {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  if (value > 0 && value <= 1) return value * 100;
  return value;
}

function addressFrom(record: AnyRecord, paths: string[], chain?: string) {
  for (const path of paths) {
    const value = stringFromPath(record, [path]);
    if (value && isLikelyAddress(value, chain)) return value;
  }
  return undefined;
}

function walletAddressPaths() {
  return ["owner", "ownerAddress", "owner_address", "wallet", "walletAddress", "wallet_address", "address", "holder", "holderAddress", "holder_address", "owner.address", "wallet.address", "holder.address"];
}

function tokenAccountAddressPaths() {
  return ["tokenAccount", "tokenAccountAddress", "token_account", "token_account_address", "account", "accountAddress", "account_address", "tokenAccount.address", "account.address"];
}

function percentPaths() {
  return ["percentage", "supplyPercent", "supply_percent", "percent", "pct", "ownerPercentage", "amountPercentage", "uiAmountPercentage", "ui_amount_percentage", "share", "ratio"];
}

function balancePaths() {
  return ["uiAmount", "ui_amount", "ui_amount_string", "balance", "amount", "amountScaled", "amount_scaled"];
}

function isLikelyAddress(value: string, chain?: string) {
  if (chain === "solana") return SOLANA_ADDRESS.test(value);
  if (chain && chain !== "solana") return EVM_ADDRESS.test(value) || value.length >= 20;
  return SOLANA_ADDRESS.test(value) || EVM_ADDRESS.test(value) || value.length >= 20;
}

function numberFromPath(record: AnyRecord, paths: string[]) {
  for (const path of paths) {
    const value = valueAtPath(record, path);
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

function stringFromPath(record: AnyRecord, paths: string[]) {
  for (const path of paths) {
    const value = valueAtPath(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function valueAtPath(record: AnyRecord, path: string) {
  return path.split(".").reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), record);
}

function asRecord(value: unknown): AnyRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
