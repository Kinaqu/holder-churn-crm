import "server-only";

import { createHash } from "node:crypto";

const SUPPORTED_CHAINS = new Set(["solana", "ethereum", "base", "bsc", "arbitrum", "optimism", "polygon"]);
const EVM_CHAINS = new Set(["ethereum", "base", "bsc", "arbitrum", "optimism", "polygon"]);
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export type TokenValidationResult =
  | {
      ok: true;
      chain: string;
      address: string;
    }
  | {
      ok: false;
      code: "INVALID_CHAIN" | "INVALID_TOKEN_ADDRESS";
      message: string;
    };

export function normalizeAndValidateTokenInput(input: { chain?: unknown; address?: unknown }): TokenValidationResult {
  const chain = String(input.chain ?? "")
    .trim()
    .toLowerCase();
  const rawAddress = String(input.address ?? "").trim();

  if (!SUPPORTED_CHAINS.has(chain)) {
    return {
      ok: false,
      code: "INVALID_CHAIN",
      message: "Unsupported chain. Use solana, ethereum, base, bsc, arbitrum, optimism, or polygon."
    };
  }

  const address = EVM_CHAINS.has(chain) ? rawAddress.toLowerCase() : rawAddress;

  if (!isValidTokenAddress(chain, address)) {
    return {
      ok: false,
      code: "INVALID_TOKEN_ADDRESS",
      message: "Token address is missing or does not match the selected chain format."
    };
  }

  return { ok: true, chain, address };
}

export function createStableTokenId(chain: string, address: string) {
  const hash = createHash("sha256").update(`${chain}:${address}`).digest("hex").slice(0, 16);
  return `${chain}-${hash}`;
}

export function isValidTokenAddress(chain: string, address: string) {
  if (!address) return false;
  if (EVM_CHAINS.has(chain)) return EVM_ADDRESS.test(address);
  if (chain === "solana") return SOLANA_ADDRESS.test(address);
  return address.length >= 20 && address.length <= 120;
}
