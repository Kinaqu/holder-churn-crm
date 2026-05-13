import type { BirdeyeSource } from "@/lib/types";

export type BirdeyeEndpointName =
  | "tokenHolders"
  | "holderDistribution"
  | "priceStats"
  | "tokenSecurity"
  | "tokenTransfers"
  | "walletCurrentNetWorth"
  | "walletNetWorth"
  | "walletBalanceChange"
  | "holderProfile"
  | "holderPositions";

export type EndpointDefinition = {
  name: BirdeyeEndpointName;
  label: BirdeyeSource;
  method: "GET" | "POST";
  path: string;
  ttlSeconds: number;
  requiredForSnapshot: boolean;
  walletRateLimit: boolean;
};

export const BIRDEYE_ENDPOINTS: Record<BirdeyeEndpointName, EndpointDefinition> = {
  tokenHolders: {
    name: "tokenHolders",
    label: "Token Holder",
    method: "GET",
    path: "/defi/v3/token/holder",
    ttlSeconds: 60 * 15,
    requiredForSnapshot: true,
    walletRateLimit: false
  },
  holderDistribution: {
    name: "holderDistribution",
    label: "Holder Distribution",
    method: "GET",
    path: "/holder/v1/distribution",
    ttlSeconds: 60 * 60,
    requiredForSnapshot: false,
    walletRateLimit: false
  },
  priceStats: {
    name: "priceStats",
    label: "Price Stats",
    method: "GET",
    path: "/defi/v3/price/stats/single",
    ttlSeconds: 60 * 3,
    requiredForSnapshot: false,
    walletRateLimit: false
  },
  tokenSecurity: {
    name: "tokenSecurity",
    label: "Token Security",
    method: "GET",
    path: "/defi/token_security",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: false
  },
  tokenTransfers: {
    name: "tokenTransfers",
    label: "Token Transfer",
    method: "POST",
    path: "/token/v1/transfer",
    ttlSeconds: 60 * 3,
    requiredForSnapshot: false,
    walletRateLimit: false
  },
  walletCurrentNetWorth: {
    name: "walletCurrentNetWorth",
    label: "Wallet Current Net Worth",
    method: "GET",
    path: "/wallet/v2/current-net-worth",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: true
  },
  walletNetWorth: {
    name: "walletNetWorth",
    label: "Wallet Net Worth",
    method: "GET",
    path: "/wallet/v2/net-worth",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: true
  },
  walletBalanceChange: {
    name: "walletBalanceChange",
    label: "Wallet Balance Change",
    method: "GET",
    path: "/wallet/v2/balance-change",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: true
  },
  holderProfile: {
    name: "holderProfile",
    label: "Holder Profile",
    method: "GET",
    path: "/defi/v3/token/holder/profile",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: false
  },
  holderPositions: {
    name: "holderPositions",
    label: "Holder Positions",
    method: "GET",
    path: "/defi/v3/token/holder/positions",
    ttlSeconds: 60 * 60 * 6,
    requiredForSnapshot: false,
    walletRateLimit: false
  }
};

export function assertAllowedEndpoint(name: BirdeyeEndpointName) {
  const endpoint = BIRDEYE_ENDPOINTS[name];
  if (!endpoint) throw new Error(`Birdeye endpoint is not allowlisted: ${name}`);
  return endpoint;
}
