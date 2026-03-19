import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { config } from "./config.js";

export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: sepolia,
    transport: http(config.sepoliaRpcUrl),
  });
}

export function getWalletClient(privateKey: `0x${string}`): WalletClient {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.sepoliaRpcUrl),
  });
}

export function getContributorWallet(): WalletClient {
  return getWalletClient(config.contributorKey);
}

export function getBorrowerWallet(): WalletClient {
  return getWalletClient(config.borrowerKey);
}
