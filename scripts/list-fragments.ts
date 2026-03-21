import { parseAbiItem } from "viem";
import { config, MEMORY_LENDING_ABI } from "./lib/config.js";
import { getPublicClient } from "./lib/wallet.js";

interface FragmentInfo {
  fragmentId: bigint;
  operatorId: bigint;
  domain: string;
  priceCredits: bigint;
  contentHash: string;
  active: boolean;
}

async function main() {
  const domainFilter = process.argv[2] || null;
  const publicClient = getPublicClient();

  // Get total fragment count
  const nextId = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "nextFragmentId",
  });

  if (nextId === 0n) {
    console.log("No fragments published yet.");
    return;
  }

  console.log(`${nextId} fragment(s) published\n`);

  // Fetch all fragments
  const fragments: FragmentInfo[] = [];
  for (let i = 0n; i < nextId; i++) {
    const f = await publicClient.readContract({
      address: config.memoryLendingAddress,
      abi: MEMORY_LENDING_ABI,
      functionName: "getFragment",
      args: [i],
    });

    if (domainFilter && f.domain !== domainFilter) continue;

    fragments.push({
      fragmentId: i,
      operatorId: f.operatorId,
      domain: f.domain,
      priceCredits: f.priceCredits,
      contentHash: f.contentHash,
      active: f.active,
    });
  }

  if (fragments.length === 0) {
    console.log(
      domainFilter
        ? `No fragments found for domain "${domainFilter}".`
        : "No fragments found."
    );
    return;
  }

  // Group by domain
  const byDomain = new Map<string, FragmentInfo[]>();
  for (const f of fragments) {
    const list = byDomain.get(f.domain) || [];
    list.push(f);
    byDomain.set(f.domain, list);
  }

  for (const [domain, frags] of byDomain) {
    const active = frags.filter((f) => f.active);
    const inactive = frags.length - active.length;

    console.log(
      `--- ${domain} (${active.length} active${inactive > 0 ? `, ${inactive} inactive` : ""}) ---`
    );

    for (const f of frags) {
      const status = f.active ? "" : " [INACTIVE]";
      console.log(
        `  #${f.fragmentId}  operator:${f.operatorId}  price:${f.priceCredits} credits  hash:${f.contentHash.slice(0, 10)}...${status}`
      );
    }
    console.log();
  }

  // Show borrower credit status if configured
  if (config.borrowerOperatorId) {
    try {
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

      console.log(`Your credit (operator ${config.borrowerOperatorId}):`);
      console.log(`  Balance: ${balance} credits`);
      console.log(`  Credit line: ${creditLine} credits`);
      console.log(
        `  Available: ${BigInt(creditLine) + BigInt(balance)} credits`
      );
    } catch {
      console.log(
        `(Could not fetch credit status — RPC rate limit. Try again shortly.)`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
