// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MemoryLending.sol";
import "../src/interfaces/IIdentityRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address identityRegistry = vm.envAddress("IDENTITY_REGISTRY");

        vm.startBroadcast(deployerKey);

        MemoryLending lending = new MemoryLending(IIdentityRegistry(identityRegistry));
        console.log("MemoryLending deployed at:", address(lending));

        vm.stopBroadcast();
    }
}
