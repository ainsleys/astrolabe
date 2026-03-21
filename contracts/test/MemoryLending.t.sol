// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MemoryLending.sol";
import "../src/OperatorRegistry.sol";
import "../src/interfaces/IIdentityRegistry.sol";
import "../src/interfaces/IOperatorRegistry.sol";
import "../src/interfaces/IReputationRegistry.sol";

/// @dev Mock reputation registry that returns configurable summaries.
///      Uses fallback for giveFeedback to avoid stack-too-deep (8 params).
contract MockRepRegistryLending {
    mapping(uint256 => int128) public summaryValues;
    mapping(uint256 => uint64) public summaryCounts;

    function setSummary(uint256 agentId, uint64 count, int128 value) external {
        summaryCounts[agentId] = count;
        summaryValues[agentId] = value;
    }

    function getSummary(uint256 agentId, address[] calldata, string calldata, string calldata)
        external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        return (summaryCounts[agentId], summaryValues[agentId], 0);
    }

    fallback() external {}
}

/// @dev Mock identity registry for lending tests
contract MockIdRegistryLending is IIdentityRegistry {
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
    OperatorRegistry opRegistry;
    MockIdRegistryLending idRegistry;
    MockRepRegistryLending repRegistry;

    address deployer_ = makeAddr("deployer");
    address contributor = makeAddr("contributor");
    address borrower = makeAddr("borrower");
    address attacker = makeAddr("attacker");

    uint256 contributorAgentId = 1;
    uint256 borrowerAgentId = 2;
    uint256 contributorOpId;
    uint256 borrowerOpId;

    bytes32 contentHash = keccak256("test content");
    string contentURI = "http://localhost:3000/fragment.md";
    string domain = "aquaculture";
    uint256 priceCredits = 3;

    function setUp() public {
        // Deploy identity registry mock
        idRegistry = new MockIdRegistryLending();
        idRegistry.setOwner(contributorAgentId, contributor);
        idRegistry.setOwner(borrowerAgentId, borrower);

        // Deploy operator registry
        opRegistry = new OperatorRegistry(IIdentityRegistry(address(idRegistry)));

        // Register operators and link agents
        vm.prank(contributor);
        contributorOpId = opRegistry.registerOperator("https://contributor.dev");
        vm.prank(contributor);
        opRegistry.linkAgent(contributorOpId, contributorAgentId);

        vm.prank(borrower);
        borrowerOpId = opRegistry.registerOperator("https://borrower.dev");
        vm.prank(borrower);
        opRegistry.linkAgent(borrowerOpId, borrowerAgentId);

        // Deploy reputation registry mock
        repRegistry = new MockRepRegistryLending();

        // Deploy lending contract (deployer_ is the deployer)
        vm.prank(deployer_);
        lending = new MemoryLending(
            IIdentityRegistry(address(idRegistry)),
            IOperatorRegistry(address(opRegistry)),
            IReputationRegistry(address(repRegistry))
        );
    }

    // ── publishFragment ──────────────────────────────────────

    function test_publishFragment() public {
        vm.prank(contributor);
        uint256 id = lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );
        assertEq(id, 0);

        MemoryLending.Fragment memory f = lending.getFragment(0);
        assertEq(f.operatorId, contributorOpId);
        assertEq(f.contributor, contributor);
        assertEq(f.contentHash, contentHash);
        assertEq(f.priceCredits, priceCredits);
        assertTrue(f.active);
    }

    function test_publishEmitsEvent() public {
        vm.prank(contributor);
        vm.expectEmit(true, true, false, true);
        emit MemoryLending.FragmentPublished(
            0, contributorOpId, contentHash, domain, priceCredits
        );
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );
    }

    function test_publishRevertsSpoofedOperatorId() public {
        vm.prank(attacker);
        vm.expectRevert("Caller does not own operator");
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );
    }

    function test_nextFragmentIdIncrements() public {
        vm.startPrank(contributor);
        uint256 id0 = lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );
        uint256 id1 = lending.publishFragment(
            contributorOpId, contentHash, contentURI, "solidity-security", priceCredits
        );
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(lending.nextFragmentId(), 2);
    }

    // ── borrowFragment (credit model) ────────────────────────

    function test_borrowDeductsCredits() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);

        // Borrower balance should be -priceCredits
        assertEq(lending.getBalance(borrowerOpId), -int256(priceCredits));
    }

    function test_borrowCreditsContributor() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);

        // Contributor balance should be +priceCredits
        assertEq(lending.getBalance(contributorOpId), int256(priceCredits));
    }

    function test_borrowEmitsEvent() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(borrower);
        vm.expectEmit(true, true, true, true);
        emit MemoryLending.FragmentBorrowed(
            0, borrowerOpId, contributorOpId, priceCredits, contentHash
        );
        lending.borrowFragment(0, borrowerOpId);
    }

    function test_borrowRevertsWhenOverCreditLine() public {
        uint256 expensivePrice = 6;
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, expensivePrice
        );

        vm.prank(borrower);
        vm.expectRevert("Exceeds credit line");
        lending.borrowFragment(0, borrowerOpId);
    }

    function test_borrowRevertsWhenOverGrantedCreditLine() public {
        uint256 expensivePrice = 8;
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, expensivePrice
        );

        vm.prank(deployer_);
        lending.setCreditLine(borrowerOpId, 5);

        vm.prank(borrower);
        vm.expectRevert("Exceeds credit line");
        lending.borrowFragment(0, borrowerOpId);
    }

    function test_borrowMultipleUntilCreditLineExhausted() public {
        vm.startPrank(contributor);
        lending.publishFragment(contributorOpId, contentHash, contentURI, domain, 3);
        lending.publishFragment(contributorOpId, keccak256("c2"), contentURI, domain, 3);
        vm.stopPrank();

        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);
        assertEq(lending.getBalance(borrowerOpId), -3);

        vm.prank(borrower);
        vm.expectRevert("Exceeds credit line");
        lending.borrowFragment(1, borrowerOpId);
    }

    function test_borrowRevertsSpoofedOperatorId() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(attacker);
        vm.expectRevert("Caller does not own operator");
        lending.borrowFragment(0, borrowerOpId);
    }

    function test_borrowRevertsInactive() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(contributor);
        lending.deactivateFragment(0);

        vm.prank(borrower);
        vm.expectRevert("Fragment not active");
        lending.borrowFragment(0, borrowerOpId);
    }

    function test_borrowRevertsWhenOperatorHasNoLinkedAgent() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(borrower);
        uint256 unlinkedOpId = opRegistry.registerOperator("https://borrower-unlinked.dev");

        vm.prank(deployer_);
        lending.setCreditLine(unlinkedOpId, 10);

        vm.prank(borrower);
        vm.expectRevert("Operator has no linked agent");
        lending.borrowFragment(0, unlinkedOpId);
    }

    // ── setCreditLine ────────────────────────────────────────

    function test_setCreditLineByDeployer() public {
        vm.prank(deployer_);
        lending.setCreditLine(borrowerOpId, 20);

        assertEq(lending.getCreditLine(borrowerOpId), 20);
    }

    function test_setCreditLineRevertsNonDeployer() public {
        vm.prank(attacker);
        vm.expectRevert("Only deployer");
        lending.setCreditLine(borrowerOpId, 20);
    }

    function test_setCreditLineEnablesLargerBorrow() public {
        // Publish an expensive fragment
        uint256 expensivePrice = 10;
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, expensivePrice
        );

        // Should fail with base credit line (5)
        vm.prank(borrower);
        vm.expectRevert("Exceeds credit line");
        lending.borrowFragment(0, borrowerOpId);

        // Increase credit line
        vm.prank(deployer_);
        lending.setCreditLine(borrowerOpId, 15);

        // Should succeed now
        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);
        assertEq(lending.getBalance(borrowerOpId), -10);
    }

    // ── balance tracking ─────────────────────────────────────

    function test_balanceTracking() public {
        // Publish two fragments
        vm.startPrank(contributor);
        lending.publishFragment(contributorOpId, contentHash, contentURI, domain, 2);
        lending.publishFragment(contributorOpId, keccak256("c2"), contentURI, domain, 1);
        vm.stopPrank();

        // Borrow both
        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);

        vm.prank(borrower);
        lending.borrowFragment(1, borrowerOpId);

        // Check balances
        assertEq(lending.getBalance(borrowerOpId), -3);
        assertEq(lending.getBalance(contributorOpId), 3);
    }

    function test_getCreditLineDefaultIsBase() public {
        assertEq(lending.getCreditLine(borrowerOpId), 5);
    }

    function test_getCreditLineUsesBaseWhenCustomIsLower() public {
        vm.prank(deployer_);
        lending.setCreditLine(borrowerOpId, 2);

        assertEq(lending.getCreditLine(borrowerOpId), 5);
    }

    // ── deactivation ─────────────────────────────────────────

    function test_deactivateOnlyContributor() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(borrower);
        vm.expectRevert("Not contributor");
        lending.deactivateFragment(0);
    }

    function test_deactivateFragment() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(contributor);
        lending.deactivateFragment(0);

        MemoryLending.Fragment memory f = lending.getFragment(0);
        assertFalse(f.active);
    }

    // ── duplicate borrow ──────────────────────────────────────

    function test_borrowRevertsDuplicate() public {
        vm.prank(contributor);
        lending.publishFragment(
            contributorOpId, contentHash, contentURI, domain, priceCredits
        );

        vm.prank(deployer_);
        lending.setCreditLine(borrowerOpId, 10);

        vm.prank(borrower);
        lending.borrowFragment(0, borrowerOpId);

        vm.prank(borrower);
        vm.expectRevert("Already borrowed");
        lending.borrowFragment(0, borrowerOpId);
    }

    // ── reputation-driven credit line ────────────────────────

    function test_reputationBonusExtendsCreditLine() public {
        // Set reputation for borrower's agent: summaryValue = 3 (positive)
        repRegistry.setSummary(borrowerAgentId, 2, 3);

        // Effective credit line should be BASE (5) + reputation bonus (3 * 2 = 6) = 11
        uint256 creditLine = lending.getCreditLine(borrowerOpId);
        assertEq(creditLine, 11);
    }

    function test_negativeReputationDoesNotReduceCreditLine() public {
        // Set negative reputation
        repRegistry.setSummary(borrowerAgentId, 2, -5);

        // Should still get BASE_CREDIT_LINE (5), no reduction
        uint256 creditLine = lending.getCreditLine(borrowerOpId);
        assertEq(creditLine, 5);
    }

    // ── constant ─────────────────────────────────────────────

    function test_baseCreditLine() public view {
        assertEq(lending.BASE_CREDIT_LINE(), 5);
    }

    function test_creditPerReputation() public view {
        assertEq(lending.CREDIT_PER_REPUTATION(), 2);
    }
}
