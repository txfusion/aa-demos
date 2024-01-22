import { Module } from "@nestjs/common";
import { AutoPaymentController } from "./auto_payments.controller";
import { AutoPaymentService } from "./auto_payments.service";
import { LoggerModule } from 'common/logger';

@Module({
    imports: [LoggerModule],
    controllers: [AutoPaymentController],
    providers: [AutoPaymentService],
    exports: [AutoPaymentService],
})
export class AutoPaymentModule {}