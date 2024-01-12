import { Controller, Get, Post } from "@nestjs/common";
import { AutoPaymentService } from "./auto_payments.service";
import { AutoSubscription } from "./entities/auto_payments.entity";

@Controller('subscription')
export class AutoPaymentController {
    constructor(private readonly autoPaymentService: AutoPaymentService){}

    @Get()
    async findAllSubscriptions(): Promise<AutoSubscription[]> {
        return this.autoPaymentService.getAllSubscriptions()
    }

    @Get('/execute')
    async executeSomething() {
        await this.autoPaymentService.executeSomething()
    }

    @Get('/eap')
    async executeAutoPayments() {
        await this.autoPaymentService.executeAutoPayments()
    }

}