import { Module } from "@nestjs/common";
import { AutoPaymentController } from "./auto_payments.controller";
import { AutoPaymentService } from "./auto_payments.service";

@Module({
    controllers: [AutoPaymentController],
    providers: [AutoPaymentService],
    exports: [AutoPaymentService],
})
export class AutoPaymentModule {}