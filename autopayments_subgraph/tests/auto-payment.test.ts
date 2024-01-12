import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { LastChanged } from "../generated/schema"
import { LastChanged as LastChangedEvent } from "../generated/AutoPayment/AutoPayment"
import { handleLastChanged } from "../src/auto-payment"
import { createLastChangedEvent } from "./auto-payment-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let _subscriber = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let _timestamp = BigInt.fromI32(234)
    let newLastChangedEvent = createLastChangedEvent(_subscriber, _timestamp)
    handleLastChanged(newLastChangedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("LastChanged created and stored", () => {
    assert.entityCount("LastChanged", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "LastChanged",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_subscriber",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "LastChanged",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "_timestamp",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
