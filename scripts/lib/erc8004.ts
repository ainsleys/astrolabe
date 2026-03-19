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
export async function submitFeedback(
  walletClient: WalletClient,
  subjectAgentId: bigint,
  reviewerAgentId: bigint,
  tag: string,
  score: number,
  comment: string
): Promise<`0x${string}`> {
  if (!walletClient.account) throw new Error("Wallet has no account");

  const hash = await walletClient.writeContract({
    address: config.reputationRegistry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "submitFeedback",
    args: [subjectAgentId, reviewerAgentId, tag, score, comment],
    account: walletClient.account,
    chain: walletClient.chain,
  });

  return hash;
}
