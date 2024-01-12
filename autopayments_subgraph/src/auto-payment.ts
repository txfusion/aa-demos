import {
  LastChanged as LastChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SubscriberAdded as SubscriberAddedEvent,
  SubscriberRemoved as SubscriberRemovedEvent
} from "../generated/AutoPayment/AutoPayment"
import {
  LastChanged,
  OwnershipTransferred,
  SubscriberAdded,
  SubscriberRemoved,
  AutoSubscription
} from "../generated/schema"
import { store } from '@graphprotocol/graph-ts'

export function handleLastChanged(event: LastChangedEvent): void {
  let entity = new LastChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._subscriber = event.params._subscriber
  entity._timestamp = event.params._timestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  //1. check if subscriber exists in the subscription table
  let subscription = AutoSubscription.load(entity._subscriber)
  //2. if it does, change the lastPayment field
  if (subscription != null) {
    subscription.lastPayment = entity.blockTimestamp
    subscription.save()
  }
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSubscriberAdded(event: SubscriberAddedEvent): void {
  let entity = new SubscriberAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._subscriber = event.params._subscriber
  entity._amount = event.params._amount
  entity._timeInterval = event.params._timeInterval

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  //1. check if subscriber exists in the subscription table
  let subscription = AutoSubscription.load(entity._subscriber)
  //2. if it doesn't, add it
  if (subscription == null) {
    subscription = new AutoSubscription(entity._subscriber)
    //execute payment (interact with backend API url which would execute the transaction)
  }
  subscription.amount = entity._amount
  subscription.timeInterval = entity._timeInterval
  subscription.lastPayment = entity.blockTimestamp
  subscription.save()
}

export function handleSubscriberRemoved(event: SubscriberRemovedEvent): void {
  let entity = new SubscriberRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._subscriber = event.params._subscriber

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  //1. check if subscriber exists in the subscription table
  let subscription = AutoSubscription.load(entity._subscriber)
  //2. if it does, remove it
  if (subscription != null) {
    store.remove('AutoSubscription', subscription.id.toString())
  }
}
