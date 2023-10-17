// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UserOperation} from "../UserOperation.sol";


interface IKernelValidator {
    function enable(bytes calldata _data) external payable;

    function disable(bytes calldata _data) external payable;

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingFunds)
        external
        payable
        returns (uint256);

    function validateSignature(bytes32 hash, bytes calldata signature) external view returns (uint256);

    function validCaller(address caller, bytes calldata data) external view returns (bool);
}