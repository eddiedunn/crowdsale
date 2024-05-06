const { expect } = require('chai');
const { ethers } = require('hardhat');

const oneWeekInSeconds = 60 * 60 * 24 * 7;


const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('Crowdsale', () => {
  let token, crowdsale
  let deployer, user1, user2

  beforeEach(async () => {
    const Crowdsale = await ethers.getContractFactory('Crowdsale')
    const Token = await ethers.getContractFactory('Token')

    token = await Token.deploy('Dapp University', 'DAPP', '1000000')

    accounts = await ethers.getSigners()
    deployer = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]

    const nowInSeconds = Math.floor(Date.now() / 1000);
    
    const nowPlusOneWeekInSeconds = nowInSeconds + oneWeekInSeconds;
    crowdsale = await Crowdsale.deploy(token.address, ether(1), '1000000', nowPlusOneWeekInSeconds)

    let transaction = await token.connect(deployer).transfer(crowdsale.address, tokens(1000000))
    await transaction.wait()
  })

  describe('Deployment', () => {

    it('sends tokens to the Crowdsale contract', async () => {
      expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(1000000))
    })

    it('returns the price', async () => {
      expect(await crowdsale.price()).to.equal(ether(1))
    })

    it('returns token address', async () => {
      expect(await crowdsale.token()).to.equal(token.address)
    })

    it('is deployer whitelisted', async () => {
      expect(await crowdsale.isInWhiteList(deployer.address))
    })

  })

  describe('Whitelisting', () => {

    describe('Success', () => {

      it('adds address to whitelist', async () => {
        await crowdsale.connect(deployer).addToWhiteList(user1.address);
        expect(await crowdsale.isInWhiteList(user1.address)).to.be.true;
      })

    })

    describe('Failure', () => {

      it('prevents non-owner from updating whitelist', async () => {
        await expect(crowdsale.connect(user1).addToWhiteList(user2.address)).to.be.reverted
      })

    })

  })

  describe('TimeLock', () => {
    let transaction, result
    let amount = tokens(10)

    describe('Failure', () => {

      it('prevents buying tokens before date', async () => {
        await crowdsale.connect(deployer).addToWhiteList(user1.address);
        await expect(crowdsale.connect(user1).buyTokens(amount, { value: ether(10) }))
          .to.be.reverted;
      });

    })

  })

  describe('Buying Tokens', () => {
    let transaction, result
    let amount = tokens(10)

    describe('Success', () => {

      beforeEach(async () => {
        await network.provider.send("evm_increaseTime", [oneWeekInSeconds-5]);
        await network.provider.send("evm_mine");
        await crowdsale.connect(deployer).addToWhiteList(user1.address);
        transaction = await crowdsale.connect(user1).buyTokens(amount, { value: ether(10) })
        result = await transaction.wait()
      })

      it('transfers tokens', async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(999990))
        expect(await token.balanceOf(user1.address)).to.equal(amount)
      })

      it('updates tokensSold', async () => {
        expect(await crowdsale.tokensSold()).to.equal(amount)
      })

      it('emits a buy event', async () => {
        // --> https://hardhat.org/hardhat-chai-matchers/docs/reference#.emit
        await expect(transaction).to.emit(crowdsale, "Buy")
          .withArgs(amount, user1.address)
      })

    })

    describe('Failure', () => {

      it('rejects insufficent ETH', async () => {
        await expect(crowdsale.connect(user1).buyTokens(tokens(10), { value: 0 })).to.be.reverted
      })

      it('rejects non-whitelist buy', async () => {
        await expect(crowdsale.connect(user2).buyTokens(tokens(10), { value: 0 })).to.be.reverted
      })

    })

  })

  describe('Sending ETH', () => {
    let transaction, result
    let amount = ether(10)

    describe('Success', () => {

      beforeEach(async () => {
        await crowdsale.connect(deployer).addToWhiteList(user1.address);
        transaction = await user1.sendTransaction({ to: crowdsale.address, value: amount })
        result = await transaction.wait()
      })

      it('updates contracts ether balance', async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(amount)
      })

      it('updates user token balance', async () => {
        expect(await token.balanceOf(user1.address)).to.equal(amount)
      })

    })
  })

  describe('Updating Price', () => {
    let transaction, result
    let price = ether(2)

    describe('Success', () => {

      beforeEach(async () => {
        transaction = await crowdsale.connect(deployer).setPrice(ether(2))
        result = await transaction.wait()
      })

      it('updates the price', async () => {
        expect(await crowdsale.price()).to.equal(ether(2))
      })

    })

    describe('Failure', () => {

      it('prevents non-owner from updating price', async () => {
        await expect(crowdsale.connect(user1).setPrice(price)).to.be.reverted
      })

    })
  })

  describe('Finalzing Sale', () => {
    let transaction, result
    let amount = tokens(10)
    let value = ether(10)

    describe('Success', () => {

      beforeEach(async () => {
        await crowdsale.connect(deployer).addToWhiteList(user1.address);
        transaction = await crowdsale.connect(user1).buyTokens(amount, { value: value })
        result = await transaction.wait()

        transaction = await crowdsale.connect(deployer).finalize()
        result = await transaction.wait()
      })

      it('transfers remaining tokens to owner', async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(0)
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999990))
      })

      it('transfers ETH balance to owner', async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(0)
      })

      it('emits Finalize event', async () => {
        // --> https://hardhat.org/hardhat-chai-matchers/docs/reference#.emit
        await expect(transaction).to.emit(crowdsale, "Finalize")
          .withArgs(amount, value)
      })

    })

    describe('Failure', () => {

      it('prevents non-owner from finalizing', async () => {
        await expect(crowdsale.connect(user1).finalize()).to.be.reverted
      })

    })
  })
})
