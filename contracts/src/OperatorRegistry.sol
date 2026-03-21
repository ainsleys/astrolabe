// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IIdentityRegistry.sol";
import "./interfaces/IOperatorRegistry.sol";

/// @title OperatorRegistry
/// @notice Register operators and link ERC-8004 agent IDs to them.
///         An operator is the persistent identity behind one or more agents.
contract OperatorRegistry is IOperatorRegistry {
    IIdentityRegistry public immutable identityRegistry;

    uint256 public nextOperatorId = 1; // start at 1 so 0 means "not found"

    mapping(uint256 => Operator) internal _operators;
    mapping(uint256 => uint256) public agentToOperator;   // agentId → operatorId
    mapping(uint256 => uint256[]) public operatorAgents;  // operatorId → agentId[]

    event OperatorRegistered(uint256 indexed operatorId, address indexed owner, string operatorURI);
    event AgentLinked(uint256 indexed operatorId, uint256 indexed agentId);

    constructor(IIdentityRegistry _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    /// @notice Register a new operator. The caller becomes the operator owner.
    function registerOperator(string calldata operatorURI) external returns (uint256 operatorId) {
        operatorId = nextOperatorId++;
        _operators[operatorId] = Operator({
            owner: msg.sender,
            operatorURI: operatorURI,
            registeredAt: block.timestamp
        });
        emit OperatorRegistered(operatorId, msg.sender, operatorURI);
    }

    /// @notice Link an ERC-8004 agent ID to an operator.
    ///         Caller must own both the operator and the agent (via identity registry).
    function linkAgent(uint256 operatorId, uint256 agentId) external {
        Operator storage op = _operators[operatorId];
        require(op.owner == msg.sender, "Not operator owner");
        require(identityRegistry.ownerOf(agentId) == msg.sender, "Caller does not own agent");
        require(agentToOperator[agentId] == 0, "Agent already linked");

        agentToOperator[agentId] = operatorId;
        operatorAgents[operatorId].push(agentId);

        emit AgentLinked(operatorId, agentId);
    }

    /// @notice Get operator data by ID
    function getOperator(uint256 operatorId) external view returns (Operator memory) {
        require(_operators[operatorId].owner != address(0), "Operator not registered");
        return _operators[operatorId];
    }

    /// @notice Look up operator ID by agent ID
    function getOperatorByAgent(uint256 agentId) external view returns (uint256 operatorId) {
        operatorId = agentToOperator[agentId];
        require(operatorId != 0, "Agent not linked to any operator");
    }

    /// @notice Get list of agent IDs linked to an operator
    function getOperatorAgents(uint256 operatorId) external view returns (uint256[] memory) {
        return operatorAgents[operatorId];
    }
}
