import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { AutoPaymentCreated } from "../generated/schema"
import { AutoPaymentCreated as AutoPaymentCreatedEvent } from "../generated/Contract/Contract"
import { handleAutoPaymentCreated } from "../src/contract"
import { createAutoPaymentCreatedEvent } from "./contract-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let autoPaymentAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newAutoPaymentCreatedEvent = createAutoPaymentCreatedEvent(
      autoPaymentAddress
    )
    handleAutoPaymentCreated(newAutoPaymentCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AutoPaymentCreated created and stored", () => {
    assert.entityCount("AutoPaymentCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AutoPaymentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "autoPaymentAddress",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
