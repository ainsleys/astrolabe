// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MemoryLending.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        MemoryLending lending = new MemoryLending();
        console.log("MemoryLending deployed at:", address(lending));

        vm.stopBroadcast();
    }
}
