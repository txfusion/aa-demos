import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { AutoPaymentCreated } from "../generated/Contract/Contract"

export function createAutoPaymentCreatedEvent(
  autoPaymentAddress: Address
): AutoPaymentCreated {
  let autoPaymentCreatedEvent = changetype<AutoPaymentCreated>(newMockEvent())

  autoPaymentCreatedEvent.parameters = new Array()

  autoPaymentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "autoPaymentAddress",
      ethereum.Value.fromAddress(autoPaymentAddress)
    )
  )

  return autoPaymentCreatedEvent
}
