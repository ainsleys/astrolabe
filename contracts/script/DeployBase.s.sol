// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/OperatorRegistry.sol";
import "../src/MemoryLending.sol";
import "../src/interfaces/IIdentityRegistry.sol";
import "../src/interfaces/IOperatorRegistry.sol";

/// @title DeployBase
/// @notice Deploy OperatorRegistry + MemoryLending to Base.
///         Uses canonical ERC-8004 Identity Registry (passed via env var).
///         Does NOT deploy mock registries.
contract DeployBase is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address identityRegistryAddr = vm.envAddress("IDENTITY_REGISTRY_ADDRESS");

        vm.startBroadcast(deployerKey);

        IIdentityRegistry identityRegistry = IIdentityRegistry(identityRegistryAddr);

        // Deploy operator registry
        OperatorRegistry opRegistry = new OperatorRegistry(identityRegistry);
        console.log("OperatorRegistry:", address(opRegistry));

        // Deploy lending contract
        MemoryLending lending = new MemoryLending(
            identityRegistry,
            IOperatorRegistry(address(opRegistry))
        );
        console.log("MemoryLending:", address(lending));

        // Register contributor operator
        uint256 contributorOpId = opRegistry.registerOperator(
            "https://github.com/ainsleys/synthesis#contributor-operator"
        );
        console.log("Contributor operator ID:", contributorOpId);

        // Link contributor agent (agent must already be registered on canonical ERC-8004)
        uint256 contributorAgentId = vm.envUint("CONTRIBUTOR_AGENT_ID");
        opRegistry.linkAgent(contributorOpId, contributorAgentId);
        console.log("Linked contributor agent ID:", contributorAgentId);

        vm.stopBroadcast();

        // Register borrower operator from borrower wallet
        uint256 borrowerKey = vm.envUint("BORROWER_PRIVATE_KEY");
        vm.startBroadcast(borrowerKey);

        uint256 borrowerOpId = opRegistry.registerOperator(
            "https://github.com/ainsleys/synthesis#borrower-operator"
        );
        console.log("Borrower operator ID:", borrowerOpId);

        // Link borrower agent
        uint256 borrowerAgentId = vm.envUint("BORROWER_AGENT_ID");
        opRegistry.linkAgent(borrowerOpId, borrowerAgentId);
        console.log("Linked borrower agent ID:", borrowerAgentId);

        vm.stopBroadcast();
    }
}
