// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IIdentityRegistry.sol";
import "./interfaces/IOperatorRegistry.sol";

/// @title MemoryLending
/// @notice Publish and borrow memory fragments with on-chain receipts.
///         Uses a credit/debt envelope so operators can borrow corrections
///         without ETH payments. Balances track net contribution vs consumption.
contract MemoryLending {
    IIdentityRegistry public immutable identityRegistry;
    IOperatorRegistry public immutable operatorRegistry;
    address public immutable deployer;

    constructor(IIdentityRegistry _identityRegistry, IOperatorRegistry _operatorRegistry) {
        identityRegistry = _identityRegistry;
        operatorRegistry = _operatorRegistry;
        deployer = msg.sender;
    }

    struct Fragment {
        uint256 operatorId;
        address contributor;
        bytes32 contentHash;
        string  contentURI;
        string  domain;
        uint256 priceCredits;
        uint256 createdAt;
        bool    active;
    }

    uint256 public nextFragmentId;
    mapping(uint256 => Fragment) public fragments;

    /// @notice Credit accounting: operatorId → net balance (can be negative)
    mapping(uint256 => int256) public balances;
    /// @notice Credit lines: operatorId → max allowed negative balance
    mapping(uint256 => uint256) public creditLines;

    /// @notice Starter credit for every operator
    uint256 public constant BASE_CREDIT_LINE = 5;

    event FragmentPublished(
        uint256 indexed fragmentId,
        uint256 indexed operatorId,
        bytes32 contentHash,
        string domain,
        uint256 priceCredits
    );

    event FragmentBorrowed(
        uint256 indexed fragmentId,
        uint256 indexed borrowerOperatorId,
        uint256 indexed contributorOperatorId,
        uint256 priceCredits,
        bytes32 contentHash
    );

    /// @notice Publish a new memory fragment
    /// @param operatorId The contributor's operator ID
    /// @param contentHash SHA-256 hash of fragment content
    /// @param contentURI Where to fetch the fragment content
    /// @param domain Knowledge domain tag
    /// @param priceCredits Price in internal credits
    function publishFragment(
        uint256 operatorId,
        bytes32 contentHash,
        string calldata contentURI,
        string calldata domain,
        uint256 priceCredits
    ) external returns (uint256 fragmentId) {
        // Verify caller owns the operator
        IOperatorRegistry.Operator memory op = operatorRegistry.getOperator(operatorId);
        require(op.owner == msg.sender, "Caller does not own operator");

        fragmentId = nextFragmentId++;
        fragments[fragmentId] = Fragment({
            operatorId: operatorId,
            contributor: msg.sender,
            contentHash: contentHash,
            contentURI: contentURI,
            domain: domain,
            priceCredits: priceCredits,
            createdAt: block.timestamp,
            active: true
        });

        emit FragmentPublished(fragmentId, operatorId, contentHash, domain, priceCredits);
    }

    /// @notice Borrow a fragment — deducts credits from borrower, credits contributor
    /// @param fragmentId The fragment to borrow
    /// @param borrowerOperatorId The borrower's operator ID
    function borrowFragment(
        uint256 fragmentId,
        uint256 borrowerOperatorId
    ) external {
        // Verify caller owns the borrower operator
        IOperatorRegistry.Operator memory op = operatorRegistry.getOperator(borrowerOperatorId);
        require(op.owner == msg.sender, "Caller does not own operator");
        require(
            operatorRegistry.getOperatorAgentCount(borrowerOperatorId) > 0,
            "Operator has no linked agent"
        );

        Fragment storage f = fragments[fragmentId];
        require(f.active, "Fragment not active");

        // Credit line check: balance after deduction must not exceed the credit line
        uint256 effectiveLimit = _effectiveCreditLine(borrowerOperatorId);
        require(
            balances[borrowerOperatorId] - int256(f.priceCredits) >= -int256(effectiveLimit),
            "Exceeds credit line"
        );

        // Update balances
        balances[borrowerOperatorId] -= int256(f.priceCredits);
        balances[f.operatorId] += int256(f.priceCredits);

        emit FragmentBorrowed(
            fragmentId,
            borrowerOperatorId,
            f.operatorId,
            f.priceCredits,
            f.contentHash
        );
    }

    /// @notice Deactivate a fragment (contributor only)
    function deactivateFragment(uint256 fragmentId) external {
        Fragment storage f = fragments[fragmentId];
        require(f.contributor == msg.sender, "Not contributor");
        f.active = false;
    }

    /// @notice Set credit line for an operator (deployer only for v0)
    function setCreditLine(uint256 operatorId, uint256 newLimit) external {
        require(msg.sender == deployer, "Only deployer");
        creditLines[operatorId] = newLimit;
    }

    /// @notice Get net balance for an operator
    function getBalance(uint256 operatorId) external view returns (int256) {
        return balances[operatorId];
    }

    /// @notice Get credit line for an operator
    function getCreditLine(uint256 operatorId) external view returns (uint256) {
        return _effectiveCreditLine(operatorId);
    }

    /// @notice Get full fragment data
    function getFragment(uint256 fragmentId) external view returns (Fragment memory) {
        return fragments[fragmentId];
    }

    /// @dev Effective credit line = max(BASE_CREDIT_LINE, creditLines[operatorId])
    ///      If setCreditLine was called with a higher value, use that; otherwise use base.
    function _effectiveCreditLine(uint256 operatorId) internal view returns (uint256) {
        uint256 custom = creditLines[operatorId];
        return custom > BASE_CREDIT_LINE ? custom : BASE_CREDIT_LINE;
    }
}
