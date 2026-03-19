// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-8004 Reputation Registry interface
interface IReputationRegistry {
    function submitFeedback(
        uint256 subjectAgentId,
        uint256 reviewerAgentId,
        string calldata tag,
        uint8 score,
        string calldata comment
    ) external;
}
