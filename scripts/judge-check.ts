import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { MEMORY_LENDING_ABI } from "./lib/config.js";

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

type Summary = {
  project: {
    name: string;
    repository: string;
    verificationMode: "human" | "ai";
  };
  localChecks: CheckResult[];
  onChainChecks: CheckResult[];
  warnings: string[];
  conclusion: {
    localReady: boolean;
    onChainVerified: boolean;
  };
};

interface EvalSummary {
  runs: number;
  tasks: Record<string, { deltas: number[] }>;
}

interface FragmentContractResult {
  operatorId: bigint;
  contributor: `0x${string}`;
  contentHash: string;
  contentURI: string;
  domain: string;
  priceCredits: bigint;
  createdAt: bigint;
  active: boolean;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
const DEFAULT_MEMORY_LENDING =
  (process.env.MEMORY_LENDING_ADDRESS ||
    "0x10c89c8f7991d72C7162EaC0CD272B75DB8EE469") as `0x${string}`;
const JSON_MODE = process.argv.includes("--json");

function printHeading(title: string) {
  console.log(`\n${title}`);
  console.log("=".repeat(title.length));
}

function report(result: CheckResult) {
  const status = result.ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${result.label}: ${result.detail}`);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function checkRequiredFiles(): CheckResult[] {
  const required = [
    "README.md",
    "agent.json",
    "explorer/index.html",
    "contracts/src/MemoryLending.sol",
    "contracts/src/OperatorRegistry.sol",
    "eval/tasks.json",
    "eval/results/repeated-eval.json",
  ];

  return required.map((path) => ({
    label: `Required file ${path}`,
    ok: existsSync(join(ROOT, path)),
    detail: existsSync(join(ROOT, path)) ? "present" : "missing",
  }));
}

function checkLocalArtifacts(): CheckResult[] {
  const tasksPath = join(ROOT, "eval", "tasks.json");
  const repeatedEvalPath = join(ROOT, "eval", "results", "repeated-eval.json");
  const fragmentsDir = join(ROOT, "fragments");
  const agentPath = join(ROOT, "agent.json");

  const tasks = JSON.parse(readFileSync(tasksPath, "utf-8")) as Array<{
    id: string;
    domain: string;
  }>;
  const repeatedEval = JSON.parse(
    readFileSync(repeatedEvalPath, "utf-8")
  ) as EvalSummary;
  const fragmentFiles = readdirSync(fragmentsDir).filter(
    (file) => file.endsWith(".md") && file !== ".gitkeep"
  );
  const servedCopies = fragmentFiles.filter((file) =>
    /-[0-9a-f]{8}\.md$/i.test(file)
  );
  const sourceFragments = fragmentFiles.length - servedCopies.length;
  const agent = JSON.parse(readFileSync(agentPath, "utf-8")) as {
    identity?: { erc8004AgentId?: number; operatorId?: number };
    source?: string;
  };

  const domainMeans = new Map<string, number[]>();
  for (const task of tasks) {
    const evalTask = repeatedEval.tasks[task.id];
    if (!evalTask) continue;
    const values = domainMeans.get(task.domain) || [];
    values.push(mean(evalTask.deltas));
    domainMeans.set(task.domain, values);
  }

  const domainSummary = Array.from(domainMeans.entries())
    .map(([domain, values]) => `${domain} ${mean(values).toFixed(2)}`)
    .join(", ");

  return [
    {
      label: "Locked eval tasks",
      ok: tasks.length > 0,
      detail: `${tasks.length} task(s) across ${new Set(tasks.map((t) => t.domain)).size} domain(s)`,
    },
    {
      label: "Repeated eval artifact",
      ok: repeatedEval.runs >= 1 && Object.keys(repeatedEval.tasks).length > 0,
      detail: `${repeatedEval.runs} run(s); mean deltas by domain: ${domainSummary}`,
    },
    {
      label: "Local fragment corpus",
      ok: fragmentFiles.length > 0,
      detail: `${sourceFragments} source fragment(s), ${servedCopies.length} served copy/copies`,
    },
    {
      label: "Autonomous agent manifest",
      ok: Boolean(agent.identity?.erc8004AgentId && agent.source),
      detail: `agent ${agent.identity?.erc8004AgentId ?? "unknown"} from ${agent.source ?? "unknown source"}`,
    },
  ];
}

async function checkOnChainState(): Promise<CheckResult[]> {
  const client = createPublicClient({
    chain: base,
    transport: http(DEFAULT_RPC_URL),
  });

  const nextId = await client.readContract({
    address: DEFAULT_MEMORY_LENDING,
    abi: MEMORY_LENDING_ABI,
    functionName: "nextFragmentId",
  });

  const fragmentIds = Array.from({ length: Number(nextId) }, (_, i) => BigInt(i));
  const fragments = (await client.multicall({
    allowFailure: false,
    contracts: fragmentIds.map((fragmentId) => ({
      address: DEFAULT_MEMORY_LENDING,
      abi: MEMORY_LENDING_ABI,
      functionName: "getFragment",
      args: [fragmentId],
    })),
  })) as unknown as FragmentContractResult[];

  const activeByDomain = new Map<string, number>();
  for (const fragment of fragments) {
    if (!fragment.active) continue;
    activeByDomain.set(
      fragment.domain,
      (activeByDomain.get(fragment.domain) || 0) + 1
    );
  }

  const domainSummary = Array.from(activeByDomain.entries())
    .map(([domain, count]) => `${domain} ${count}`)
    .join(", ");

  return [
    {
      label: "On-chain fragment registry",
      ok: nextId > 0n,
      detail: `${nextId} fragment(s) published on Base`,
    },
    {
      label: "On-chain active domains",
      ok: activeByDomain.size > 0,
      detail: domainSummary || "no active domains found",
    },
  ];
}

async function main() {
  const localResults = [
    ...checkRequiredFiles(),
    ...checkLocalArtifacts(),
  ];

  let rpcResults: CheckResult[] = [];
  const warnings: string[] = [];

  try {
    rpcResults = await checkOnChainState();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      message.includes("over rate limit")
        ? "Public Base RPC rate-limited. Set RPC_URL to your own provider and rerun judge-check."
        : `RPC check failed: ${message}`
    );
  }

  const failedLocal = localResults.filter((result) => !result.ok);
  const summary: Summary = {
    project: {
      name: "Astrolabe",
      repository: "https://github.com/ainsleys/astrolabe",
      verificationMode: JSON_MODE ? "ai" : "human",
    },
    localChecks: localResults,
    onChainChecks: rpcResults,
    warnings,
    conclusion: {
      localReady: failedLocal.length === 0,
      onChainVerified: rpcResults.length > 0 && warnings.length === 0,
    },
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
    if (failedLocal.length > 0) process.exit(1);
    return;
  }

  printHeading("Astrolabe Judge Check");
  for (const result of localResults) report(result);

  printHeading("On-Chain Read-Only Checks");
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`[WARN] ${warning}`);
    }
  } else {
    for (const result of rpcResults) report(result);
  }

  printHeading("Summary");
  console.log(
    failedLocal.length === 0
      ? "Local materials look judge-ready."
      : `${failedLocal.length} required local check(s) failed.`
  );
  console.log(
    warnings.length > 0
      ? "On-chain verification was skipped or degraded; the repo materials are still present locally."
      : "On-chain verification succeeded."
  );

  if (failedLocal.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
