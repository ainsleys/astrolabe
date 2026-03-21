import { config, MEMORY_LENDING_ABI } from "./lib/config.js";
import { getDeployerWallet, getPublicClient } from "./lib/wallet.js";

async function main() {
  const operatorIdStr = process.argv[2];
  const creditLineStr = process.argv[3];

  if (!operatorIdStr || !creditLineStr) {
    console.error("Usage: set-credit-line <operator-id> <credit-line>");
    process.exit(1);
  }

  const operatorId = BigInt(operatorIdStr);
  const creditLine = BigInt(creditLineStr);

  const wallet = getDeployerWallet();
  const publicClient = getPublicClient();

  console.log("Setting operator credit line...");
  console.log(`  Operator ID: ${operatorId}`);
  console.log(`  Credit line: ${creditLine}`);

  const hash = await wallet.writeContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "setCreditLine",
    args: [operatorId, creditLine],
    account: wallet.account!,
    chain: wallet.chain,
  });

  console.log(`  Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Block: ${receipt.blockNumber}`);

  const updatedCreditLine = await publicClient.readContract({
    address: config.memoryLendingAddress,
    abi: MEMORY_LENDING_ABI,
    functionName: "getCreditLine",
    args: [operatorId],
  });

  console.log(`  Updated credit line: ${updatedCreditLine}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
