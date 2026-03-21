// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/interfaces/IIdentityRegistry.sol";

/// @title MockIdentityRegistry
/// @notice Minimal ERC-8004 Identity Registry mock for Sepolia testing.
///         Agents register themselves; ownerOf returns the registrant.
contract MockIdentityRegistry is IIdentityRegistry {
    uint256 public nextAgentId = 1;

    struct Agent {
        address owner;
        string  uri;
    }

    mapping(uint256 => Agent) public agents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri);

    function registerAgent(string calldata uri) external returns (uint256 agentId) {
        agentId = nextAgentId++;
        agents[agentId] = Agent({ owner: msg.sender, uri: uri });
        emit AgentRegistered(agentId, msg.sender, uri);
    }

    function ownerOf(uint256 agentId) external view override returns (address) {
        address owner = agents[agentId].owner;
        require(owner != address(0), "Agent not registered");
        return owner;
    }

    function agentURI(uint256 agentId) external view override returns (string memory) {
        return agents[agentId].uri;
    }
}
