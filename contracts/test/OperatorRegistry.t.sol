// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OperatorRegistry.sol";
import "../src/interfaces/IIdentityRegistry.sol";

/// @dev Mock identity registry for operator tests
contract MockIdRegistry is IIdentityRegistry {
    mapping(uint256 => address) public owners;

    function setOwner(uint256 agentId, address owner) external {
        owners[agentId] = owner;
    }

    function ownerOf(uint256 agentId) external view override returns (address) {
        address owner = owners[agentId];
        require(owner != address(0), "Agent not registered");
        return owner;
    }

    function agentURI(uint256) external pure override returns (string memory) {
        return "";
    }
}

contract OperatorRegistryTest is Test {
    OperatorRegistry registry;
    MockIdRegistry idRegistry;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address attacker = makeAddr("attacker");

    uint256 agentId1 = 1;
    uint256 agentId2 = 2;
    uint256 agentId3 = 3;

    function setUp() public {
        idRegistry = new MockIdRegistry();
        idRegistry.setOwner(agentId1, alice);
        idRegistry.setOwner(agentId2, alice);
        idRegistry.setOwner(agentId3, bob);

        registry = new OperatorRegistry(IIdentityRegistry(address(idRegistry)));
    }

    // ── registerOperator ─────────────────────────────────────

    function test_registerOperator() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        assertEq(opId, 1);
        IOperatorRegistry.Operator memory op = registry.getOperator(opId);
        assertEq(op.owner, alice);
        assertEq(op.registeredAt, block.timestamp);
    }

    function test_registerOperatorEmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit OperatorRegistry.OperatorRegistered(1, alice, "https://alice.dev");
        registry.registerOperator("https://alice.dev");
    }

    function test_registerMultipleOperators() public {
        vm.prank(alice);
        uint256 opId1 = registry.registerOperator("https://alice.dev");

        vm.prank(bob);
        uint256 opId2 = registry.registerOperator("https://bob.dev");

        assertEq(opId1, 1);
        assertEq(opId2, 2);
        assertEq(registry.nextOperatorId(), 3);
    }

    // ── linkAgent ────────────────────────────────────────────

    function test_linkAgent() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        vm.prank(alice);
        registry.linkAgent(opId, agentId1);

        assertEq(registry.agentToOperator(agentId1), opId);
        assertEq(registry.getOperatorByAgent(agentId1), opId);

        uint256[] memory agents = registry.getOperatorAgents(opId);
        assertEq(agents.length, 1);
        assertEq(agents[0], agentId1);
    }

    function test_linkAgentEmitsEvent() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit OperatorRegistry.AgentLinked(opId, agentId1);
        registry.linkAgent(opId, agentId1);
    }

    function test_linkMultipleAgents() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        vm.prank(alice);
        registry.linkAgent(opId, agentId1);

        vm.prank(alice);
        registry.linkAgent(opId, agentId2);

        uint256[] memory agents = registry.getOperatorAgents(opId);
        assertEq(agents.length, 2);
        assertEq(agents[0], agentId1);
        assertEq(agents[1], agentId2);
    }

    function test_linkAgentRevertsNotOperatorOwner() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        // Bob tries to link his agent to Alice's operator
        vm.prank(bob);
        vm.expectRevert("Not operator owner");
        registry.linkAgent(opId, agentId3);
    }

    function test_linkAgentRevertsNotAgentOwner() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        // Alice tries to link Bob's agent to her operator
        vm.prank(alice);
        vm.expectRevert("Caller does not own agent");
        registry.linkAgent(opId, agentId3);
    }

    function test_linkAgentRevertsDuplicate() public {
        vm.prank(alice);
        uint256 opId = registry.registerOperator("https://alice.dev");

        vm.prank(alice);
        registry.linkAgent(opId, agentId1);

        vm.prank(alice);
        vm.expectRevert("Agent already linked");
        registry.linkAgent(opId, agentId1);
    }

    // ── getOperator ──────────────────────────────────────────

    function test_getOperatorRevertsNotRegistered() public {
        vm.expectRevert("Operator not registered");
        registry.getOperator(999);
    }

    // ── getOperatorByAgent ───────────────────────────────────

    function test_getOperatorByAgentRevertsNotLinked() public {
        vm.expectRevert("Agent not linked to any operator");
        registry.getOperatorByAgent(agentId1);
    }
}
