import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  LastChanged,
  OwnershipTransferred,
  SubscriberAdded,
  SubscriberRemoved
} from "../generated/AutoPayment/AutoPayment"

export function createLastChangedEvent(
  _subscriber: Address,
  _timestamp: BigInt
): LastChanged {
  let lastChangedEvent = changetype<LastChanged>(newMockEvent())

  lastChangedEvent.parameters = new Array()

  lastChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_subscriber",
      ethereum.Value.fromAddress(_subscriber)
    )
  )
  lastChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_timestamp",
      ethereum.Value.fromUnsignedBigInt(_timestamp)
    )
  )

  return lastChangedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createSubscriberAddedEvent(
  _subscriber: Address,
  _amount: BigInt,
  _timeInterval: BigInt
): SubscriberAdded {
  let subscriberAddedEvent = changetype<SubscriberAdded>(newMockEvent())

  subscriberAddedEvent.parameters = new Array()

  subscriberAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_subscriber",
      ethereum.Value.fromAddress(_subscriber)
    )
  )
  subscriberAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_amount",
      ethereum.Value.fromUnsignedBigInt(_amount)
    )
  )
  subscriberAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_timeInterval",
      ethereum.Value.fromUnsignedBigInt(_timeInterval)
    )
  )

  return subscriberAddedEvent
}

export function createSubscriberRemovedEvent(
  _subscriber: Address
): SubscriberRemoved {
  let subscriberRemovedEvent = changetype<SubscriberRemoved>(newMockEvent())

  subscriberRemovedEvent.parameters = new Array()

  subscriberRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "_subscriber",
      ethereum.Value.fromAddress(_subscriber)
    )
  )

  return subscriberRemovedEvent
}
