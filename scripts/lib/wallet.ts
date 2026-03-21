import {
  createPublicClient,
  createWalletClient,
  http,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { config } from "./config.js";

export function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(config.rpcUrl),
  });
}

export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: base,
    transport: http(config.rpcUrl),
  });
}

export function getContributorWallet(): WalletClient {
  return getWalletClient(config.contributorKey);
}

export function getBorrowerWallet(): WalletClient {
  return getWalletClient(config.borrowerKey);
}

export function getDeployerWallet(): WalletClient {
  return getWalletClient(config.deployerKey);
}
