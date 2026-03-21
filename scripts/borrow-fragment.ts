import { keccak256, toHex } from "viem";
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
  console.log(`  Price: ${fragment.priceCredits} credits`);
  console.log(`  Content URI: ${fragment.contentURI}`);
  console.log(`  Expected hash: ${fragment.contentHash}`);

  // Step 2: Display borrower credit balance and credit line
  console.log(`\nBorrower credit status (operator ${config.borrowerOperatorId}):`);

  const balance = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getBalance",
    args: [config.borrowerOperatorId],
  });

  const creditLine = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getCreditLine",
    args: [config.borrowerOperatorId],
  });

  console.log(`  Current balance: ${balance} credits`);
  console.log(`  Credit line: ${creditLine} credits`);
  console.log(`  Available to borrow: ${BigInt(creditLine) + BigInt(balance)} credits`);

  // Step 3: Fetch content from URI
  console.log("\nFetching content from URI...");
  const response = await fetch(fragment.contentURI);
  if (!response.ok) {
    console.error(
      `Failed to fetch content: ${response.status} ${response.statusText}`
    );
    process.exit(1);
  }
  const content = await response.text();
  console.log(`  Fetched ${content.length} bytes`);

  // Step 4: Verify content hash BEFORE borrowing
  const actualHash = keccak256(toHex(content));
  console.log(`  Actual hash: ${actualHash}`);
  if (actualHash !== fragment.contentHash) {
    console.error("CONTENT HASH MISMATCH — aborting. No borrow recorded.");
    console.error(`  Expected: ${fragment.contentHash}`);
    console.error(`  Got:      ${actualHash}`);
    process.exit(1);
  }
  console.log("  Hash verified.");

  // Step 5: Send borrow transaction (no ETH payment — credit-based)
  console.log("\nSending borrow transaction...");
  const hash = await wallet.writeContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "borrowFragment",
    args: [fragmentId, config.borrowerOperatorId],
    account: wallet.account!,
    chain: wallet.chain,
  });

  console.log(`  Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Block: ${receipt.blockNumber}`);
  console.log(`  Borrower operator ID: ${config.borrowerOperatorId}`);
  console.log(`  Contributor operator ID: ${fragment.operatorId}`);

  // Step 6: Save borrow receipt
  mkdirSync(BORROWS_DIR, { recursive: true });

  const borrowReceipt = {
    fragmentId: fragmentId.toString(),
    domain: fragment.domain,
    contentHash: fragment.contentHash,
    contentURI: fragment.contentURI,
    contributorOperatorId: fragment.operatorId.toString(),
    borrowerOperatorId: config.borrowerOperatorId.toString(),
    priceCredits: fragment.priceCredits.toString(),
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
