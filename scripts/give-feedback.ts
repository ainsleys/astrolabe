import { keccak256, toHex } from "viem";
import { config } from "./lib/config.js";
import { getPublicClient, getBorrowerWallet } from "./lib/wallet.js";
import { giveFeedback } from "./lib/erc8004.js";

async function main() {
  const scoreStr = process.argv[2];
  const domain = process.argv[3] || "aquaculture";
  const comment = process.argv[4] || "";

  if (!scoreStr) {
    console.error("Usage: give-feedback <score-1-to-10> [domain] [comment]");
    process.exit(1);
  }

  const score = parseInt(scoreStr);
  if (score < 1 || score > 10) {
    console.error("Score must be between 1 and 10");
    process.exit(1);
  }

  const publicClient = getPublicClient();
  const wallet = getBorrowerWallet();

  // feedbackURI/hash are empty for now — could point to eval results
  const feedbackURI = "";
  const feedbackHash =
    comment
      ? keccak256(toHex(comment))
      : ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`);

  console.log("Submitting feedback to ERC-8004 Reputation Registry...");
  console.log(`  Subject (contributor) agent ID: ${config.contributorAgentId}`);
  console.log(`  Tag1: memory-lend`);
  console.log(`  Tag2: ${domain}`);
  console.log(`  Score: ${score}`);
  console.log(`  Comment: ${comment || "(none)"}`);

  const hash = await giveFeedback(
    wallet,
    config.contributorAgentId,
    score,
    "memory-lend",
    domain,
    feedbackURI,
    feedbackHash
  );

  console.log(`  Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log("Feedback submitted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
