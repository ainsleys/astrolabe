import { keccak256, toHex, formatEther } from "viem";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config, MEMORY_LENDING_ABI } from "./lib/config.js";
import { getPublicClient, getBorrowerWallet } from "./lib/wallet.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BORROWS_DIR = join(__dirname, "..", "borrows");

async function main() {
  const fragmentIdStr = process.argv[2];
  if (!fragmentIdStr) {
    console.error("Usage: borrow-fragment <fragment-id>");
    process.exit(1);
  }

  const fragmentId = BigInt(fragmentIdStr);
  const publicClient = getPublicClient();
  const wallet = getBorrowerWallet();

  // Step 1: Get fragment metadata on-chain
  console.log(`Fetching fragment ${fragmentId} metadata...`);
  const fragment = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getFragment",
    args: [fragmentId],
  });

  if (!fragment.active) {
    console.error("Fragment is not active");
    process.exit(1);
  }

  console.log(`  Domain: ${fragment.domain}`);
  console.log(`  Price: ${formatEther(fragment.priceWei)} ETH`);
  console.log(`  Content URI: ${fragment.contentURI}`);
  console.log(`  Expected hash: ${fragment.contentHash}`);

  // Step 2: Fetch content from URI
  console.log("Fetching content from URI...");
  const response = await fetch(fragment.contentURI);
  if (!response.ok) {
    console.error(
      `Failed to fetch content: ${response.status} ${response.statusText}`
    );
    process.exit(1);
  }
  const content = await response.text();
  console.log(`  Fetched ${content.length} bytes`);

  // Step 3: Verify content hash BEFORE paying
  const actualHash = keccak256(toHex(content));
  console.log(`  Actual hash: ${actualHash}`);
  if (actualHash !== fragment.contentHash) {
    console.error("CONTENT HASH MISMATCH — aborting. No payment sent.");
    console.error(`  Expected: ${fragment.contentHash}`);
    console.error(`  Got:      ${actualHash}`);
    process.exit(1);
  }
  console.log("  Hash verified.");

  // Step 4: Send borrow transaction
  console.log("Sending borrow transaction...");
  const hash = await wallet.writeContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "borrowFragment",
    args: [fragmentId, config.borrowerAgentId],
    value: fragment.priceWei,
    account: wallet.account!,
    chain: wallet.chain,
  });

  console.log(`  Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log(`  Borrower agent ID: ${config.borrowerAgentId}`);
  console.log(`  Contributor agent ID: ${fragment.contributorAgentId}`);

  // Step 5: Save borrow receipt
  mkdirSync(BORROWS_DIR, { recursive: true });

  const borrowReceipt = {
    fragmentId: fragmentId.toString(),
    domain: fragment.domain,
    contentHash: fragment.contentHash,
    contentURI: fragment.contentURI,
    contributorAgentId: fragment.contributorAgentId.toString(),
    borrowerAgentId: config.borrowerAgentId.toString(),
    priceWei: fragment.priceWei.toString(),
    borrowTxHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    content,
  };

  const receiptPath = join(BORROWS_DIR, `fragment-${fragmentId}.json`);
  writeFileSync(receiptPath, JSON.stringify(borrowReceipt, null, 2));
  console.log(`  Receipt saved: ${receiptPath}`);
  console.log("Done. Fragment borrowed successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
