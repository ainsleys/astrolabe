import "dotenv/config";
import { type Abi } from "viem";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  rpcUrl: requireEnv("RPC_URL"),
  deployerKey: requireEnv("DEPLOYER_PRIVATE_KEY") as `0x${string}`,
  contributorKey: requireEnv("CONTRIBUTOR_PRIVATE_KEY") as `0x${string}`,
  borrowerKey: requireEnv("BORROWER_PRIVATE_KEY") as `0x${string}`,
  memoryLendingAddress: requireEnv("MEMORY_LENDING_ADDRESS") as `0x${string}`,
  operatorRegistryAddress: requireEnv("OPERATOR_REGISTRY_ADDRESS") as `0x${string}`,
  identityRegistry: optionalEnv(
    "IDENTITY_REGISTRY",
    "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
  ) as `0x${string}`,
  reputationRegistry: optionalEnv(
    "REPUTATION_REGISTRY",
    "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
  ) as `0x${string}`,
  contributorAgentId: BigInt(optionalEnv("CONTRIBUTOR_AGENT_ID", "0")),
  borrowerAgentId: BigInt(optionalEnv("BORROWER_AGENT_ID", "0")),
  contributorOperatorId: BigInt(optionalEnv("CONTRIBUTOR_OPERATOR_ID", "0")),
  borrowerOperatorId: BigInt(optionalEnv("BORROWER_OPERATOR_ID", "0")),
  anthropicApiKey: optionalEnv("ANTHROPIC_API_KEY", ""),
  fragmentServerPort: parseInt(optionalEnv("FRAGMENT_SERVER_PORT", "3000")),
};

export const OPERATOR_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerOperator",
    inputs: [{ name: "operatorURI", type: "string" }],
    outputs: [{ name: "operatorId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "linkAgent",
    inputs: [
      { name: "operatorId", type: "uint256" },
      { name: "agentId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getOperator",
    inputs: [{ name: "operatorId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "operatorURI", type: "string" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOperatorByAgent",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "operatorId", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextOperatorId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const satisfies Abi;

export const MEMORY_LENDING_ABI = [
  {
    type: "function",
    name: "publishFragment",
    inputs: [
      { name: "operatorId", type: "uint256" },
      { name: "contentHash", type: "bytes32" },
      { name: "contentURI", type: "string" },
      { name: "domain", type: "string" },
      { name: "priceCredits", type: "uint256" },
    ],
    outputs: [{ name: "fragmentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "borrowFragment",
    inputs: [
      { name: "fragmentId", type: "uint256" },
      { name: "borrowerOperatorId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deactivateFragment",
    inputs: [{ name: "fragmentId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getFragment",
    inputs: [{ name: "fragmentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "operatorId", type: "uint256" },
          { name: "contributor", type: "address" },
          { name: "contentHash", type: "bytes32" },
          { name: "contentURI", type: "string" },
          { name: "domain", type: "string" },
          { name: "priceCredits", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextFragmentId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [{ name: "operatorId", type: "uint256" }],
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCreditLine",
    inputs: [{ name: "operatorId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setCreditLine",
    inputs: [
      { name: "operatorId", type: "uint256" },
      { name: "newLimit", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "FragmentPublished",
    inputs: [
      { name: "fragmentId", type: "uint256", indexed: true },
      { name: "operatorId", type: "uint256", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "domain", type: "string", indexed: false },
      { name: "priceCredits", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FragmentBorrowed",
    inputs: [
      { name: "fragmentId", type: "uint256", indexed: true },
      { name: "borrowerOperatorId", type: "uint256", indexed: true },
      { name: "contributorOperatorId", type: "uint256", indexed: true },
      { name: "priceCredits", type: "uint256", indexed: false },
      { name: "contentHash", type: "bytes32", indexed: false },
    ],
  },
] as const satisfies Abi;

export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const satisfies Abi;
