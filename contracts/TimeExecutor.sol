pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TimeExecutor {

    function send(address _receipient, uint _amount, bytes calldata data) external payable {  
         (bool success, ) = _receipient.call{value: _amount}(data);
         require(success, "call failed");
    }

}

