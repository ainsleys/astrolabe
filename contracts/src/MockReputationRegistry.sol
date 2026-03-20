// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationRegistry.sol";

/// @title MockReputationRegistry
/// @notice Minimal ERC-8004 Reputation Registry mock for Sepolia testing.
contract MockReputationRegistry is IReputationRegistry {
    event FeedbackGiven(
        uint256 indexed agentId,
        int128 value,
        uint8 valueDecimals,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external override {
        emit FeedbackGiven(agentId, value, valueDecimals, tag1, tag2, endpoint, feedbackURI, feedbackHash);
    }
}
