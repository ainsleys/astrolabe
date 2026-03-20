import { type PublicClient, type WalletClient } from "viem";
import { config, REPUTATION_REGISTRY_ABI } from "./config.js";

/// Check if an agent ID is registered in the ERC-8004 Identity Registry
export async function isAgentRegistered(
  publicClient: PublicClient,
  agentId: bigint
): Promise<boolean> {
  try {
    const owner = await publicClient.readContract({
      address: config.identityRegistry,
      abi: [
        {
          type: "function",
          name: "ownerOf",
          inputs: [{ name: "tokenId", type: "uint256" }],
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
        },
      ] as const,
      functionName: "ownerOf",
      args: [agentId],
    });
    return owner !== "0x0000000000000000000000000000000000000000";
  } catch {
    return false;
  }
}

/// Submit feedback to the ERC-8004 Reputation Registry
/// Score is 1-10, stored as value with 0 decimals.
/// tag1 = "memory-lend", tag2 = domain tag (e.g. "aquaculture").
export async function giveFeedback(
  walletClient: WalletClient,
  agentId: bigint,
  score: number,
  tag1: string,
  tag2: string,
  feedbackURI: string,
  feedbackHash: `0x${string}`
): Promise<`0x${string}`> {
  if (!walletClient.account) throw new Error("Wallet has no account");

  const hash = await walletClient.writeContract({
    address: config.reputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      agentId,
      BigInt(score), // int128
      0,             // uint8 valueDecimals
      tag1,
      tag2,
      "", // endpoint — unused for now
      feedbackURI,
      feedbackHash,
    ],
    account: walletClient.account,
    chain: walletClient.chain,
  });

  return hash;
}
