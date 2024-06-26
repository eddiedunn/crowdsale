//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Crowdsale {
    address owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    address[] public white_list;
    uint public unLockTime;

    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);

    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        uint _unLockTime
    ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        white_list.push(msg.sender);
        unLockTime = _unLockTime;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // Buy tokens directly by sending Ether
    // --> https://docs.soliditylang.org/en/v0.8.15/contracts.html#receive-ether-function

    receive() external payable {
        uint256 amount = msg.value / price;
        buyTokens(amount * 1e18);
    }

    function buyTokens(uint256 _amount) public payable {
        require(isInWhiteList(msg.sender), "You are not in the white list");
        require(block.timestamp >= unLockTime, "The sale is not unlocked yet");
        require(msg.value == (_amount / 1e18) * price);
        require(token.balanceOf(address(this)) >= _amount, "Not enough tokens left");
        require(token.transfer(msg.sender, _amount), "Could not transfer tokens");

        tokensSold += _amount;

        emit Buy(_amount, msg.sender);
    }

    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function addToWhiteList(address _address_to_whitelist) public onlyOwner {
        white_list.push(_address_to_whitelist);
    }

    function isInWhiteList(address _address) public view returns (bool) {
        for (uint i = 0; i < white_list.length; i++) {
            if (white_list[i] == _address) {
                return true;
            }
        }
        return false;
    }

    // Finalize Sale
    function finalize() public onlyOwner {
        require(token.transfer(owner, token.balanceOf(address(this))));

        uint256 value = address(this).balance;
        (bool sent, ) = owner.call{value: value}("");
        require(sent);

        emit Finalize(tokensSold, value);
    }
}
