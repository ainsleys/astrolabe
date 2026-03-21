import { keccak256, toHex } from "viem";
import { config, MEMORY_LENDING_ABI } from "./lib/config.js";
import { getPublicClient, getContributorWallet } from "./lib/wallet.js";
import { readFileSync, copyFileSync, existsSync } from "fs";
import { resolve, basename, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAGMENTS_DIR = resolve(join(__dirname, "..", "fragments"));

async function main() {
  const contentPath = process.argv[2];
  const domain = process.argv[3] || "aquaculture";
  const priceCreditsStr = process.argv[4] || "3";

  if (!contentPath) {
    console.error("Usage: publish-fragment <content-file> [domain] [price-credits]");
    process.exit(1);
  }

  const resolvedPath = resolve(contentPath);
  const content = readFileSync(resolvedPath, "utf-8");
  const contentHash = keccak256(toHex(content));

  // Use hash prefix in filename to avoid basename collisions between publishes
  const hashPrefix = contentHash.slice(2, 10);
  const origName = basename(resolvedPath);
  const ext = origName.includes(".") ? origName.slice(origName.lastIndexOf(".")) : "";
  const stem = origName.includes(".") ? origName.slice(0, origName.lastIndexOf(".")) : origName;
  const servedName = `${stem}-${hashPrefix}${ext}`;
  const fragmentsPath = join(FRAGMENTS_DIR, servedName);

  // Copy into fragments/ — content-addressed name means no overwrites
  if (!existsSync(fragmentsPath)) {
    console.log(`  Copying ${resolvedPath} → ${fragmentsPath}`);
    copyFileSync(resolvedPath, fragmentsPath);
  }

  const contentURI = `http://localhost:${config.fragmentServerPort}/${servedName}`;
  const priceCredits = BigInt(priceCreditsStr);

  console.log("Publishing fragment...");
  console.log(`  Domain: ${domain}`);
  console.log(`  Price: ${priceCreditsStr} credits`);
  console.log(`  Content hash: ${contentHash}`);
  console.log(`  Content URI: ${contentURI}`);
  console.log(`  Contributor operator ID: ${config.contributorOperatorId}`);

  const publicClient = getPublicClient();
  const wallet = getContributorWallet();

  const hash = await wallet.writeContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "publishFragment",
    args: [config.contributorOperatorId, contentHash, contentURI, domain, priceCredits],
    account: wallet.account!,
    chain: wallet.chain,
  });

  console.log(`  Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Block: ${receipt.blockNumber}`);

  // Parse the FragmentPublished event to get the fragment ID
  const publishedLog = receipt.logs.find(
    (log) =>
      log.topics[0] ===
      keccak256(
        toHex(
          "FragmentPublished(uint256,uint256,bytes32,string,uint256)"
        )
      )
  );

  if (publishedLog?.topics[1]) {
    const fragmentId = BigInt(publishedLog.topics[1]);
    console.log(`  Fragment ID: ${fragmentId}`);
    console.log();
    console.log("Next steps:");
    console.log(`  npm run list-fragments              # see all available fragments`);
    console.log(`  npm run borrow-fragment -- ${fragmentId}       # borrow this fragment`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
