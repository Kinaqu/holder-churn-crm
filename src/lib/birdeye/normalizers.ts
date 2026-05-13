import type { HolderSnapshot } from "@/lib/types";

type AnyRecord = Record<string, unknown>;

export type NormalizedHolderDistribution = {
  top10SupplyPercent: number;
  top50SupplyPercent: number;
  holderCount?: number;
};

export type NormalizedPriceStats = {
  priceUsd: number;
  priceChange24h: number;
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

export function normalizeHolders(raw: unknown): HolderSnapshot[] {
  const items = extractArray(raw);
  const now = new Date().toISOString();

  return items.slice(0, 500).map((item, index) => {
    const walletAddress = stringFrom(item, ["owner", "wallet", "walletAddress", "address", "ownerAddress"]) ?? `unknown-${index}`;
    const balance = numberFrom(item, ["uiAmount", "ui_amount", "balance", "amount"]) ?? 0;
    const supplyPercent = numberFrom(item, ["percentage", "supplyPercent", "percent", "pct"]) ?? 0;
    const balanceUsd = numberFrom(item, ["valueUsd", "value_usd", "balanceUsd", "usdValue"]) ?? 0;

    return {
      walletAddress,
      balance,
      balanceUsd,
      supplyPercent,
      holderRank: index + 1,
      snapshotAt: now,
      sourceEndpoint: "Token Holder"
    };
  });
}

export function normalizeDistribution(raw: unknown): NormalizedHolderDistribution {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  const holders = extractArray(raw);

  const top10SupplyPercent =
    numberFrom(data, ["top10", "top10SupplyPercent", "top10HolderPercent", "top_10_supply_percent"]) ??
    sumHolderPercent(holders.slice(0, 10));
  const top50SupplyPercent =
    numberFrom(data, ["top50", "top50SupplyPercent", "top50HolderPercent", "top_50_supply_percent"]) ??
    sumHolderPercent(holders.slice(0, 50));

  return {
    top10SupplyPercent,
    top50SupplyPercent,
    holderCount: numberFrom(data, ["holderCount", "holder_count", "total"])
  };
}

export function normalizePriceStats(raw: unknown): NormalizedPriceStats {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  const frame24h = asRecord(data["24h"]) ?? asRecord(asRecord(data.items)?.["24h"]);

  return {
    priceUsd: numberFrom(data, ["price", "priceUsd", "value", "current"]) ?? numberFrom(frame24h ?? {}, ["price", "current"]) ?? 0,
    priceChange24h:
      numberFrom(data, ["priceChange24h", "change24h", "priceChangePercent24h"]) ??
      numberFrom(frame24h ?? {}, ["priceChangePercent", "price_change_percent", "changePercent"]) ??
      0
  };
}

export function normalizeTransfers(raw: unknown): NormalizedTokenTransfer[] {
  return extractArray(raw).map((item, index) => ({
    txHash: stringFrom(item, ["tx_hash", "txHash", "signature", "hash"]) ?? `unknown-transfer-${index}`,
    fromWallet: stringFrom(item, ["from_wallet", "fromWallet", "from"]),
    toWallet: stringFrom(item, ["to_wallet", "toWallet", "to"]),
    amount: numberFrom(item, ["amount", "ui_amount", "uiAmount"]),
    valueUsd: numberFrom(item, ["value", "valueUsd", "value_usd"]),
    blockUnixTime: numberFrom(item, ["block_unix_time", "blockUnixTime", "timestamp"])
  }));
}

export function normalizeWalletCurrentNetWorth(raw: unknown, walletAddress: string): NormalizedWalletCurrentNetWorth {
  const record = asRecord(raw) ?? {};
  const data = asRecord(record.data) ?? record;
  return {
    walletAddress,
    netWorthUsd: numberFrom(data, ["netWorth", "netWorthUsd", "totalUsd", "totalValue", "value"]) ?? 0
  };
}

function extractArray(raw: unknown): AnyRecord[] {
  const record = asRecord(raw);
  if (!record) return [];
  const data = asRecord(record.data);
  const candidates = [
    record.data,
    data?.items,
    data?.holders,
    data?.list,
    data?.data,
    data?.transfers,
    data?.txs,
    record.items,
    record.holders,
    record.list,
    record.transfers,
    record.txs
  ];
  const array = candidates.find(Array.isArray);
  return Array.isArray(array) ? array.filter(isRecord) : [];
}

function sumHolderPercent(holders: AnyRecord[]) {
  return holders.reduce((sum, holder) => sum + (numberFrom(holder, ["percentage", "supplyPercent", "percent", "pct"]) ?? 0), 0);
}

function numberFrom(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  }
  return undefined;
}

function stringFrom(record: AnyRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function asRecord(value: unknown): AnyRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
