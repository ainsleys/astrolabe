// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockReputationRegistry
/// @notice Minimal mock — accepts any giveFeedback call via fallback.
///         Not used in v5 tests but kept for local Sepolia testing.
contract MockReputationRegistry {
    event FeedbackReceived(address indexed caller, uint256 indexed agentId);

    fallback() external {
        // Decode just the agentId (first param after selector)
        uint256 agentId;
        assembly {
            agentId := calldataload(4)
        }
        emit FeedbackReceived(msg.sender, agentId);
    }
}
