import { AutoPaymentCreated as AutoPaymentCreatedEvent } from "../generated/Contract/Contract"
import { AutoPaymentCreated } from "../generated/schema"

export function handleAutoPaymentCreated(event: AutoPaymentCreatedEvent): void {
  let entity = new AutoPaymentCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.autoPaymentAddress = event.params.autoPaymentAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
