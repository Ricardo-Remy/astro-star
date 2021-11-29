/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require("crypto-js/sha256");
const BlockClass = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      let block = new BlockClass({ data: "Genesis Block" });
      await this._addBlock(block);
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  async _addBlock(block) {
    let self = this;
    const { chain } = self;
    try {
      // Get block height
      block.height = chain.length;
      // Get block time
      block.time = new Date().getTime().toString().slice(0, -3);

      // Set previous block hash for non-genesis blocks
      if (chain.length > 0) {
        block.previousBlockHash = chain[chain.length - 1].hash;
      }

      // Compute block hash and push to chain
      block.hash = SHA256(JSON.stringify(block)).toString();

      // Verify chain before pushing a new block
      const chainValidationError = await self.validateChain();

      if (!chainValidationError.length) return chain.push(block);
    } catch (error) {
      throw new Error("Error inside _addBlock(block)", error);
    }
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    try {
      return `${address}:${new Date()
        .getTime()
        .toString()
        .slice(0, -3)}:starRegistry`;
    } catch (error) {
      throw new Error(
        "Error inside requestMessageOwnershipVerification(address)",
        error
      );
    }
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  async submitStar(address, message, signature, star) {
    let self = this;
    const { chain } = self;
    try {
      const signInMessageTime = parseInt(message.split(":")[1]);
      const currentTime = parseInt(
        new Date().getTime().toString().slice(0, -3)
      );
      const verifiedMessage = bitcoinMessage.verify(
        message,
        address,
        signature
      );

      // Check if time signature time is less than 5 minutes
      if (currentTime - signInMessageTime >= 5 * 60)
        throw new Error("Exceeded signature time of 5 minutes");

      // Check the bitcoinMessage verification before adding a new block
      if (!verifiedMessage) throw new Error("Invalid verification message");

      await self._addBlock(new BlockClass({ owner: address, star }));

      // Return the last added block
      return chain[chain.length - 1];
    } catch (error) {
      throw new Error(
        "Error inside submitStar(address, message, signature, star)",
        error
      );
    }
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  async getBlockByHash(hash) {
    let self = this;
    const { chain } = self;
    try {
      // filter the hash in the chain based on the provided hash
      return chain.filter((el) => el.hash === hash)[0];
    } catch (error) {
      throw new Error("Error inside getBlockByHash(hash)", error);
    }
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve) => {
      let block = self.chain.filter((p) => p.height === height)[0];
      if (block) {
        resolve(block);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  async getStarsByWalletAddress(address) {
    let self = this;
    let { chain } = self;
    try {
      // Decode star Object
      const getBlockData = Promise.all(chain.map((block) => block.getBData()));

      // Store resolved Promise in variable
      const getDecodedData = await getBlockData;

      // Filter by owner address
      const getOwnerStars = getDecodedData.filter(
        (block) => block.owner === address
      );

      return getOwnerStars;
    } catch (error) {
      throw new Error("Error inside getStarsByWalletAddress(address)", error);
    }
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  async validateChain() {
    let self = this;
    let errorLog = [];
    const { chain } = self;
    const validBlocks = [];

    try {
      for (let block of chain) {
        // Loop through all the blocks of the chain and verify if they are valid blocks
        const promisedBlocks = await block.validate();
        validBlocks.push(promisedBlocks);

        // If one of the block of the promiseBlocks is not valid the chain does not validate
        if (!validBlocks.includes(false)) {
          // Omit genesis block
          if (block.height > 0) {
            // Get the previous block of the chain
            const previousBlock = chain.filter(
              (el) => el.height === block.height - 1
            )[0];

            // Compare both hashes for validity
            if (block.previousBlockHash !== previousBlock.hash) {
              errorLog.push(
                new Error(
                  "block.previousBlockHash does not match previousBlock.hash"
                )
              );
            }
          }
        } else {
          errorLog.push(
            new Error(
              `Invalid Block found in Chain - #${block.height}: ${block.hash}`
            )
          );
        }
      }
      return errorLog;
    } catch (error) {
      throw new Error("Error inside validateChain()", error);
    }
  }
}

module.exports.Blockchain = Blockchain;
