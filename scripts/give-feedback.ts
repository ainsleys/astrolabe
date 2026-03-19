import { config } from "./lib/config.js";
import { getPublicClient, getBorrowerWallet } from "./lib/wallet.js";
import { submitFeedback } from "./lib/erc8004.js";

async function main() {
  const scoreStr = process.argv[2];
  const comment = process.argv[3] || "";

  if (!scoreStr) {
    console.error("Usage: give-feedback <score-1-to-10> [comment]");
    process.exit(1);
  }

  const score = parseInt(scoreStr);
  if (score < 1 || score > 10) {
    console.error("Score must be between 1 and 10");
    process.exit(1);
  }

  const publicClient = getPublicClient();
  const wallet = getBorrowerWallet();

  console.log("Submitting feedback to ERC-8004 Reputation Registry...");
  console.log(`  Subject (contributor) agent ID: ${config.contributorAgentId}`);
  console.log(`  Reviewer (borrower) agent ID: ${config.borrowerAgentId}`);
  console.log(`  Tag: memory-lend`);
  console.log(`  Score: ${score}`);
  console.log(`  Comment: ${comment || "(none)"}`);

  const hash = await submitFeedback(
    wallet,
    config.contributorAgentId,
    config.borrowerAgentId,
    "memory-lend",
    score,
    comment
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
