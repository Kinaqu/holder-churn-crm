export type SolanaPresetToken = {
  symbol: "SOL" | "BONK" | "WIF" | "JUP";
  name: string;
  address: string;
  decimals: number;
  accent: string;
  description: string;
};

export const SOLANA_PRESET_TOKENS: SolanaPresetToken[] = [
  {
    symbol: "SOL",
    name: "Wrapped Solana",
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
    accent: "#41d7c8",
    description: "Native Solana liquidity"
  },
  {
    symbol: "BONK",
    name: "Bonk",
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    accent: "#f6c85f",
    description: "Solana meme coin"
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
    accent: "#ff6b7a",
    description: "High-velocity community token"
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    accent: "#7ab7ff",
    description: "Solana trading hub"
  }
];
