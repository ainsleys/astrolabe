// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MemoryLending.sol";
import "../src/interfaces/IIdentityRegistry.sol";

/// @dev Mock identity registry that maps agentId → owner
contract MockIdentityRegistry is IIdentityRegistry {
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

contract MemoryLendingTest is Test {
    MemoryLending lending;
    MockIdentityRegistry registry;
    address contributor = makeAddr("contributor");
    address borrower = makeAddr("borrower");
    address attacker = makeAddr("attacker");
    uint256 contributorAgentId = 1;
    uint256 borrowerAgentId = 2;
    bytes32 contentHash = keccak256("test content");
    string contentURI = "http://localhost:3000/fragment.md";
    string domain = "aquaculture";
    uint256 price = 0.001 ether;

    function setUp() public {
        registry = new MockIdentityRegistry();
        registry.setOwner(contributorAgentId, contributor);
        registry.setOwner(borrowerAgentId, borrower);

        lending = new MemoryLending(IIdentityRegistry(address(registry)));

        vm.deal(contributor, 10 ether);
        vm.deal(borrower, 10 ether);
        vm.deal(attacker, 10 ether);
    }

    function test_publishFragment() public {
        vm.prank(contributor);
        uint256 id = lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );
        assertEq(id, 0);

        MemoryLending.Fragment memory f = lending.getFragment(0);
        assertEq(f.contributorAgentId, contributorAgentId);
        assertEq(f.contributor, contributor);
        assertEq(f.contentHash, contentHash);
        assertEq(f.priceWei, price);
        assertTrue(f.active);
    }

    function test_publishEmitsEvent() public {
        vm.prank(contributor);
        vm.expectEmit(true, true, false, true);
        emit MemoryLending.FragmentPublished(
            0, contributorAgentId, contributor, contentHash, domain, price
        );
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );
    }

    function test_publishRevertsSpoofedAgentId() public {
        vm.prank(attacker);
        vm.expectRevert("Caller does not own contributor agent ID");
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );
    }

    function test_borrowFragment() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        uint256 contributorBefore = contributor.balance;

        vm.prank(borrower);
        vm.expectEmit(true, true, true, true);
        emit MemoryLending.FragmentBorrowed(
            0, borrowerAgentId, contributorAgentId, price, contentHash
        );
        lending.borrowFragment{value: price}(0, borrowerAgentId);

        assertEq(contributor.balance, contributorBefore + price);
    }

    function test_borrowRevertsSpoofedAgentId() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        vm.prank(attacker);
        vm.expectRevert("Caller does not own borrower agent ID");
        lending.borrowFragment{value: price}(0, borrowerAgentId);
    }

    function test_borrowRevertsInsufficientPayment() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        vm.prank(borrower);
        vm.expectRevert("Insufficient payment");
        lending.borrowFragment{value: price - 1}(0, borrowerAgentId);
    }

    function test_borrowRevertsInactive() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        vm.prank(contributor);
        lending.deactivateFragment(0);

        vm.prank(borrower);
        vm.expectRevert("Fragment not active");
        lending.borrowFragment{value: price}(0, borrowerAgentId);
    }

    function test_deactivateOnlyContributor() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        vm.prank(borrower);
        vm.expectRevert("Not contributor");
        lending.deactivateFragment(0);
    }

    function test_nextFragmentIdIncrements() public {
        vm.startPrank(contributor);
        uint256 id0 = lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );
        uint256 id1 = lending.publishFragment(
            contributorAgentId, contentHash, contentURI, "solidity-security", price
        );
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(lending.nextFragmentId(), 2);
    }

    function test_overpaymentGoesToContributor() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorAgentId, contentHash, contentURI, domain, price
        );

        uint256 overpay = price * 2;
        uint256 contributorBefore = contributor.balance;

        vm.prank(borrower);
        lending.borrowFragment{value: overpay}(0, borrowerAgentId);

        assertEq(contributor.balance, contributorBefore + overpay);
    }
}
