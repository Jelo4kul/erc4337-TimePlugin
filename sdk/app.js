const { ECDSAProvider, ValidatorMode } = require('@zerodev/sdk');
const { LocalAccountSigner } = require('@alchemy/aa-core');
const { encodeFunctionData, parseAbi, parseEther } = require('viem');
require("dotenv").config();

//ZeroDev Project ID
const projectId = process.env.PROJECT_ID_SEPOLIA

//The Abi of the Executor contract we will be interacting with
const executorABI = parseAbi([
    'function send(address _receipient, uint _amount, bytes calldata data) external'
]);
//The Abi of the Smart account contract
const kernelABI = parseAbi([
    'function setExecution(bytes4 _selector, address _executor, address _validator, uint48 _validUntil, uint48 _validAfter, bytes calldata _enableData) external payable',
]);

let selector, execAddress, validatorAddress, validUntil, validAfter, enableData;
//The function selector of the send function in the Executor contract
selector = '0x9bd9bbc6';
//The address of the Executor contract
execAddress = '0x7726cd328385DA01681f2760102995bfcDd063ca';
validatorAddress = '0x2Cd68391BA5aAfc3f41aE4e815e988501e2346E2';
const maxUint48 = 0xFFFFFFFFFFFF;
validUntil = maxUint48; //is the timestamp at which the enabledData expires. When set to 0, it never expires
validAfter = 0; //is the timestamp at which the enabledData becomes active. When set to 0, it's immediately active

const encodeTimeObject = ({ ownerAddress, duration, startTime }) => {
    const encodedData = ownerAddress + duration + startTime;
    return encodedData;
}

const setExecution = async (owner, duration, startTime) => {
    //create the AA wallet
    let ecdsaProvider = await ECDSAProvider.init({
        projectId,
        owner,
    });

    const address = await ecdsaProvider.getAddress();
    console.log('Smart wallet address:', address);

    const timeObject = {
        ownerAddress: await owner.getAddress(),
        duration: duration.toString(16).padStart(12, '0'),
        startTime: startTime.toString(16).padStart(12, '0')
    };

    enableData = encodeTimeObject(timeObject);

    //This is the UserOperation Calldata
    //Set the executor and validator for a specific function selector
    const { hash } = await ecdsaProvider.sendUserOperation({
        //The address here is the smart contract address after it has been deployed/created
        target: address,
        value: 0,
        data: encodeFunctionData({
            abi: kernelABI,
            functionName: 'setExecution',
            args: [selector, execAddress, validatorAddress, validUntil, validAfter, enableData]
        })
    })

    //This will wait for the user operation to be included in a transaction that's been mined.
    await ecdsaProvider.waitForUserOperationTransaction(hash);

    console.log("Validator and Executor set");

    return new Promise((resolve) => {
        resolve(address);
    });

}

//Address argument is the address of the smart wallet
const sendMoney = async (_kernelAddress, _owner, _recipient, _amount, _data) => {
    //Set the AA wallet to plugin mode
    let ecdsaProvider = await ECDSAProvider.init({
        projectId,
        owner: _owner,
        opts: {
            validatorConfig: {
                mode: ValidatorMode.plugin,
            }
        }
    });

    console.log("Executing transaction");

    //This is the UserOperation Calldata
    //Set the executor and validator for a specific function selector
    const { hash } = await ecdsaProvider.sendUserOperation({
        //The address of our kernel contract
        //If you call a different contract other than the kernel contract, the calldata will be 
        //prepended with the functionSelector of the execute function in the Kernel contract and its parameters.
        target: _kernelAddress,
        data: encodeFunctionData({
            abi: executorABI,
            functionName: 'send',
            args: [_recipient, _amount, _data]
        })
    })

    await ecdsaProvider.waitForUserOperationTransaction(hash);

}

//SAmple input: 0.0001
//Sample output: 0x00000000000000000000000000000000000000000000000000005af3107a4000
const padNumToHex = (num) => {
    return '0x' + parseEther(num + '').toString(16).padStart(64, '0');
}

const main = async () => {

    //The "owner of the AA wallet, which in this case is a private key"
    const owner = LocalAccountSigner.privateKeyToAccountSigner(process.env.PRIVATE_KEY)

    let currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);
    let duration = currentTimeInSeconds + 240; //4 mins
    let startTime = currentTimeInSeconds;
    let friendsAddress = '0x6fc05B7DFe545cd488E9D47d56CFaCA88F69A2e1';
    const amount = padNumToHex(0.0001);

    //links the validator and executor to the smart account
    const kernelAddress = await setExecution(owner, duration, startTime);

    console.log("Making transfer");

    //transfers money out of the contract
    await sendMoney(kernelAddress, owner, friendsAddress, amount, "");

    console.log("Chukwu biko");
}

main().then(() => process.exit(0));