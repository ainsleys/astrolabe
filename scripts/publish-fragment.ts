import { keccak256, toHex, parseEther } from "viem";
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
  const priceEth = process.argv[4] || "0.001";

  if (!contentPath) {
    console.error("Usage: publish-fragment <content-file> [domain] [price-eth]");
    process.exit(1);
  }

  const resolvedPath = resolve(contentPath);
  const fileName = basename(resolvedPath);
  const fragmentsPath = join(FRAGMENTS_DIR, fileName);

  // Ensure the file is in fragments/ so the serve endpoint can find it
  if (resolve(fragmentsPath) !== resolvedPath) {
    console.log(`  Copying ${resolvedPath} → ${fragmentsPath}`);
    copyFileSync(resolvedPath, fragmentsPath);
  }

  // Hash from fragments/ copy — this is what the server will serve
  const content = readFileSync(fragmentsPath, "utf-8");
  const contentHash = keccak256(toHex(content));
  const contentURI = `http://localhost:${config.fragmentServerPort}/${fileName}`;
  const priceWei = parseEther(priceEth);

  console.log("Publishing fragment...");
  console.log(`  Domain: ${domain}`);
  console.log(`  Price: ${priceEth} ETH`);
  console.log(`  Content hash: ${contentHash}`);
  console.log(`  Content URI: ${contentURI}`);
  console.log(`  Contributor agent ID: ${config.contributorAgentId}`);

  const publicClient = getPublicClient();
  const wallet = getContributorWallet();

  const hash = await wallet.writeContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "publishFragment",
    args: [config.contributorAgentId, contentHash, contentURI, domain, priceWei],
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
          "FragmentPublished(uint256,uint256,address,bytes32,string,uint256)"
        )
      )
  );

  if (publishedLog?.topics[1]) {
    const fragmentId = BigInt(publishedLog.topics[1]);
    console.log(`  Fragment ID: ${fragmentId}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
