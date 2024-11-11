// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

// Interface for wrapped TRX
interface IWTRX is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

contract SwapBurnContract is Ownable {
    ISwapRouter public immutable swapRouter;
    IWTRX public immutable WTRX = IWTRX(0xfb3b3134F13CcD2C81F4012E53024e8135d58FeE);

    event TokenSwapped(
        address indexed tokenOut,
        uint256 trxAmountIn,
        uint256 tokensReceived
    );
    event TokensBurned(address indexed token, uint256 amount);
    
    constructor(address _swapRouter) Ownable(msg.sender) {
        swapRouter = ISwapRouter(_swapRouter);
        // WTRX = IWTRX(_wtrx);
    }
    
    function swapAndBurn(address tokenAddress) external payable {
        require(msg.value > 0, "Must send TRX");
        
        // First wrap TRX to WTRX
        WTRX.deposit{value: msg.value}();
        
        // Approve the router to spend WTRX
        WTRX.approve(address(swapRouter), msg.value);
        
        // Perform the swap
        uint256 tokensReceived = _swapExactTRXForTokens(
            tokenAddress,
            msg.value
        );
        
        // Burn the received tokens
        _burnTokens(tokenAddress, tokensReceived);
    }
    
    function _swapExactTRXForTokens(
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // Wrap parameters for the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: address(WTRX),  // Use WTRX address instead of address(0)
                tokenOut: tokenOut,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: amountIn,
                amountOutMinimum: 0, // Be careful with this in production!
                sqrtPriceLimitX96: 0
            });

        // Execute the swap
        amountOut = swapRouter.exactInputSingle(params);  // Remove the value parameter
        
        emit TokenSwapped(tokenOut, amountIn, amountOut);
        return amountOut;
    }
    
    function _burnTokens(address token, uint256 amount) internal {
        // Some tokens have a burn function, but for those that don't,
        // we'll send to a dead address
        address DEAD_ADDRESS = address(0x0000000000000000000000000000000000000000);
        
        IERC20(token).transfer(DEAD_ADDRESS, amount);
        
        emit TokensBurned(token, amount);
    }
    
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    function rescueTRX() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
}