// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapBurnContract is Ownable {
    IUniswapV2Router02 public immutable swapRouter;
    IUniswapV2Factory public immutable factory;
    address public immutable WTRX;
    
    uint256 public constant MINIMUM_LIQUIDITY = 1000; // Adjust this threshold as needed

    event TokenSwapped(
        address indexed tokenOut,
        uint256 trxAmountIn,
        uint256 tokensReceived
    );
    event TokensBurned(address indexed token, uint256 amount);

    constructor(
        address _swapRouter,
        address _factory
    ) Ownable(msg.sender) {
        swapRouter = IUniswapV2Router02(_swapRouter);
        factory = IUniswapV2Factory(_factory);
        WTRX = IUniswapV2Router02(_swapRouter).WETH();
    }

    function checkPairLiquidity(
        address tokenOut
    ) public view returns (bool exists) {
        address pairAddress = factory.getPair(WTRX, tokenOut);
        if (pairAddress == address(0)) {
            return false;
        }

        IUniswapV2Pair pair = IUniswapV2Pair(pairAddress);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        
        // Check if both reserves have sufficient liquidity
        bool hasLiquidity = (reserve0 >= MINIMUM_LIQUIDITY && reserve1 >= MINIMUM_LIQUIDITY);
        
        return hasLiquidity;
    }

    function swapAndBurn(address tokenAddress) external payable {
        require(msg.value > 0, "Must send TRX");
    
        // Get the pair address for WTRX and tokenAddress
        address pairAddress = factory.getPair(WTRX, tokenAddress);
        require(pairAddress != address(0), "No pair exists");
    
        // Create the path array correctly
        address[] memory path = new address[](2);
        path[0] = WTRX;
        path[1] = tokenAddress; 
    
        // Perform the swap directly with TRX
        uint256[] memory amounts = swapRouter.swapExactETHForTokens{value: msg.value}(
            0,                   // Accept any amount of tokens (for simplicity)
            path,              // The path array
            address(this),       // Recipient of tokens
            block.timestamp + 15 minutes // Deadline
        );
    
        uint256 tokensReceived = amounts[1];
        emit TokenSwapped(tokenAddress, msg.value, tokensReceived);
    
        // Burn the received tokens
        address DEAD_ADDRESS = address(1);
        IERC20(tokenAddress).transfer(DEAD_ADDRESS, tokensReceived);
        emit TokensBurned(tokenAddress, tokensReceived);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    function rescueTRX() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}

}