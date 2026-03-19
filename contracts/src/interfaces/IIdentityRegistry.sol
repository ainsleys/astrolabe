// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-8004 Identity Registry interface
interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
    function agentURI(uint256 agentId) external view returns (string memory);
}
