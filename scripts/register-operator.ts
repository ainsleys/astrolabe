import { config, OPERATOR_REGISTRY_ABI } from "./lib/config.js";
import { getPublicClient, getContributorWallet, getBorrowerWallet } from "./lib/wallet.js";

async function main() {
  const operatorURI = process.argv[2];
  if (!operatorURI) {
    console.error("Usage: register-operator <operator-uri>");
    process.exit(1);
  }

  const publicClient = getPublicClient();

  // --- Register contributor operator ---
  console.log("Registering contributor operator...");
  const contributorWallet = getContributorWallet();

  const contributorTxHash = await contributorWallet.writeContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "registerOperator",
    args: [operatorURI],
    account: contributorWallet.account!,
    chain: contributorWallet.chain,
  });

  console.log(`  Tx: ${contributorTxHash}`);
  const contributorReceipt = await publicClient.waitForTransactionReceipt({
    hash: contributorTxHash,
  });
  console.log(`  Block: ${contributorReceipt.blockNumber}`);

  // Read the next operator ID to derive the one just assigned
  const nextId = await publicClient.readContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "nextOperatorId",
  });
  const contributorOperatorId = nextId - 1n;
  console.log(`  Contributor operator ID: ${contributorOperatorId}`);

  // Link contributor agent to operator
  console.log(`  Linking contributor agent ${config.contributorAgentId} to operator ${contributorOperatorId}...`);
  const linkContributorTx = await contributorWallet.writeContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "linkAgent",
    args: [contributorOperatorId, config.contributorAgentId],
    account: contributorWallet.account!,
    chain: contributorWallet.chain,
  });

  console.log(`  Tx: ${linkContributorTx}`);
  const linkContributorReceipt = await publicClient.waitForTransactionReceipt({
    hash: linkContributorTx,
  });
  console.log(`  Block: ${linkContributorReceipt.blockNumber}`);
  console.log(`  Contributor agent linked.`);
  console.log();

  // --- Register borrower operator ---
  console.log("Registering borrower operator...");
  const borrowerWallet = getBorrowerWallet();

  const borrowerTxHash = await borrowerWallet.writeContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "registerOperator",
    args: [operatorURI],
    account: borrowerWallet.account!,
    chain: borrowerWallet.chain,
  });

  console.log(`  Tx: ${borrowerTxHash}`);
  const borrowerReceipt = await publicClient.waitForTransactionReceipt({
    hash: borrowerTxHash,
  });
  console.log(`  Block: ${borrowerReceipt.blockNumber}`);

  const nextId2 = await publicClient.readContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "nextOperatorId",
  });
  const borrowerOperatorId = nextId2 - 1n;
  console.log(`  Borrower operator ID: ${borrowerOperatorId}`);

  // Link borrower agent to operator
  console.log(`  Linking borrower agent ${config.borrowerAgentId} to operator ${borrowerOperatorId}...`);
  const linkBorrowerTx = await borrowerWallet.writeContract({
    address: config.operatorRegistryAddress,
    abi: OPERATOR_REGISTRY_ABI,
    functionName: "linkAgent",
    args: [borrowerOperatorId, config.borrowerAgentId],
    account: borrowerWallet.account!,
    chain: borrowerWallet.chain,
  });

  console.log(`  Tx: ${linkBorrowerTx}`);
  const linkBorrowerReceipt = await publicClient.waitForTransactionReceipt({
    hash: linkBorrowerTx,
  });
  console.log(`  Block: ${linkBorrowerReceipt.blockNumber}`);
  console.log(`  Borrower agent linked.`);
  console.log();

  // --- Summary ---
  console.log("=== Operator Registration Summary ===");
  console.log(`  Contributor operator ID: ${contributorOperatorId}`);
  console.log(`  Borrower operator ID:    ${borrowerOperatorId}`);
  console.log();
  console.log("Add to your .env:");
  console.log(`  CONTRIBUTOR_OPERATOR_ID=${contributorOperatorId}`);
  console.log(`  BORROWER_OPERATOR_ID=${borrowerOperatorId}`);
  console.log();
  console.log("Next step:");
  console.log(`  npm run set-credit-line -- ${borrowerOperatorId} 8`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
