
export async function isExecutable(autoSubscription, signer){
    const blockNumber = await signer.provider.getBlockNumber();
    const block = await signer.provider.getBlock(blockNumber);
    console.log("Current block timestamp: ", block.timestamp);

    const accountBalance = await signer.provider.getBalance(autoSubscription.id);
    console.log("Balance of Delegable Account: ", accountBalance.toString())

    const condition1: boolean = Number(autoSubscription.lastPayment) + Number(autoSubscription.timeInterval) < Number(block.timestamp)
    const condition2: boolean = Number(autoSubscription.amount) <= Number(accountBalance)
    console.log("Condition 1: ", condition1)
    console.log("Condition 2: ", condition2)
    
    return condition1 && condition2 
}