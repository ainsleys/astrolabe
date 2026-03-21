// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the OperatorRegistry contract
interface IOperatorRegistry {
    struct Operator {
        address owner;
        string  operatorURI;
        uint256 registeredAt;
    }

    function registerOperator(string calldata operatorURI) external returns (uint256 operatorId);
    function linkAgent(uint256 operatorId, uint256 agentId) external;
    function getOperator(uint256 operatorId) external view returns (Operator memory);
    function getOperatorByAgent(uint256 agentId) external view returns (uint256 operatorId);
    function getOperatorAgentCount(uint256 operatorId) external view returns (uint256);
}
