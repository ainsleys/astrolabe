// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IIdentityRegistry.sol";

/// @title MemoryLending
/// @notice Publish and borrow memory fragments with on-chain receipts.
///         ERC-8004 agent IDs are first-class in every receipt.
contract MemoryLending {
    IIdentityRegistry public immutable identityRegistry;

    constructor(IIdentityRegistry _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    struct Fragment {
        uint256 contributorAgentId;
        address contributor;
        bytes32 contentHash;
        string  contentURI;
        string  domain;
        uint256 priceWei;
        uint256 createdAt;
        bool    active;
    }

    uint256 public nextFragmentId;
    mapping(uint256 => Fragment) public fragments;

    event FragmentPublished(
        uint256 indexed fragmentId,
        uint256 indexed contributorAgentId,
        address contributor,
        bytes32 contentHash,
        string domain,
        uint256 priceWei
    );

    event FragmentBorrowed(
        uint256 indexed fragmentId,
        uint256 indexed borrowerAgentId,
        uint256 indexed contributorAgentId,
        uint256 pricePaid,
        bytes32 contentHash
    );

    /// @notice Publish a new memory fragment
    function publishFragment(
        uint256 contributorAgentId,
        bytes32 contentHash,
        string calldata contentURI,
        string calldata domain,
        uint256 priceWei
    ) external returns (uint256 fragmentId) {
        require(
            identityRegistry.ownerOf(contributorAgentId) == msg.sender,
            "Caller does not own contributor agent ID"
        );
        fragmentId = nextFragmentId++;
        fragments[fragmentId] = Fragment({
            contributorAgentId: contributorAgentId,
            contributor: msg.sender,
            contentHash: contentHash,
            contentURI: contentURI,
            domain: domain,
            priceWei: priceWei,
            createdAt: block.timestamp,
            active: true
        });

        emit FragmentPublished(
            fragmentId,
            contributorAgentId,
            msg.sender,
            contentHash,
            domain,
            priceWei
        );
    }

    /// @notice Borrow a fragment — pays contributor, emits receipt with both agent IDs
    function borrowFragment(
        uint256 fragmentId,
        uint256 borrowerAgentId
    ) external payable {
        require(
            identityRegistry.ownerOf(borrowerAgentId) == msg.sender,
            "Caller does not own borrower agent ID"
        );
        Fragment storage f = fragments[fragmentId];
        require(f.active, "Fragment not active");
        require(msg.value >= f.priceWei, "Insufficient payment");

        // Transfer payment to contributor
        (bool sent, ) = f.contributor.call{value: msg.value}("");
        require(sent, "Payment failed");

        emit FragmentBorrowed(
            fragmentId,
            borrowerAgentId,
            f.contributorAgentId,
            msg.value,
            f.contentHash
        );
    }

    /// @notice Deactivate a fragment (contributor only)
    function deactivateFragment(uint256 fragmentId) external {
        Fragment storage f = fragments[fragmentId];
        require(f.contributor == msg.sender, "Not contributor");
        f.active = false;
    }

    /// @notice Get full fragment data
    function getFragment(uint256 fragmentId) external view returns (Fragment memory) {
        return fragments[fragmentId];
    }
}
