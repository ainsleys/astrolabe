// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MemoryLending.sol";
import "../src/MockIdentityRegistry.sol";
import "../src/MockReputationRegistry.sol";
import "../src/interfaces/IIdentityRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy mock registries (ERC-8004 not on Sepolia)
        MockIdentityRegistry identity = new MockIdentityRegistry();
        console.log("MockIdentityRegistry:", address(identity));

        MockReputationRegistry reputation = new MockReputationRegistry();
        console.log("MockReputationRegistry:", address(reputation));

        // Deploy lending contract
        MemoryLending lending = new MemoryLending(IIdentityRegistry(address(identity)));
        console.log("MemoryLending:", address(lending));

        // Register contributor agent (deployer = contributor)
        uint256 contributorAgentId = identity.registerAgent(
            "https://github.com/ainsleys/synthesis#contributor"
        );
        console.log("Contributor agent ID:", contributorAgentId);

        vm.stopBroadcast();

        // Register borrower agent from borrower wallet
        uint256 borrowerKey = vm.envUint("BORROWER_PRIVATE_KEY");
        vm.startBroadcast(borrowerKey);

        uint256 borrowerAgentId = identity.registerAgent(
            "https://github.com/ainsleys/synthesis#borrower"
        );
        console.log("Borrower agent ID:", borrowerAgentId);

        vm.stopBroadcast();
    }
}
