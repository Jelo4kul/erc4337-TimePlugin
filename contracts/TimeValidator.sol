// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "./interfaces/IKernelValidator.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "https://github.com/Vectorized/solady/blob/main/src/utils/ECDSA.sol";
import "https://github.com/zerodevapp/kernel/blob/main/src/common/Types.sol";


struct TimeStorage {
    address owner;
    ValidUntil duration;
    ValidAfter startTime;
}

/**
 * @title TransferValidator
 * @dev Validates transfer of Eth from a smart wallet
 */
contract TimeValidator is IKernelValidator {

    //address is the address of the smartAccount/Kernel
    mapping (address => TimeStorage) timeguard;

    function disable(bytes calldata) external payable override {
        delete timeguard[msg.sender];
    }

    //A sample of how the _data parameter should loook like: 0xF0dEeBDC25296Db1Ce2542d6EE59f7A61e758792000000000078000065296339
    function enable(bytes calldata _data) external payable override {
        address owner = address(bytes20(_data[0:20]));
        ValidUntil duration = ValidUntil.wrap(uint48(bytes6(_data[20:26])));
        ValidAfter startTime = ValidAfter.wrap(uint48(bytes6(_data[26:32])));

        timeguard[msg.sender] = TimeStorage({
            owner: owner,
            duration: duration,
            startTime: startTime
        });

    }

   function validateUserOp(UserOperation calldata _userOp, bytes32 _userOpHash, uint256)
        external
        payable
        override
        returns (ValidationData)
    {
        TimeStorage storage timeStorage = timeguard[msg.sender];    
        bytes32 hash = ECDSA.toEthSignedMessageHash(_userOpHash);
        address recoveredAddress = ECDSA.recover(hash, _userOp.signature);
        if(recoveredAddress != timeStorage.owner) {
            return SIG_VALIDATION_FAILED;
        }

        return packValidationData(timeStorage.startTime, timeStorage.duration);
    }

    function validateSignature(bytes32 hash, bytes calldata signature) public pure override returns (uint256) {
          revert("not implemented");
    }

    function validCaller(address _caller, bytes calldata) external pure override returns (bool) {
        revert("not implemented");

    }

}
