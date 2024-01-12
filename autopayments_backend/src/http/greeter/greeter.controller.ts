import { Controller, Get, Req } from "@nestjs/common";
import { GreeterService } from "./greeter.service";
import { Greeter } from "./entities/greeter.entity";

@Controller('greeter')
export class GreeterController {
    constructor(private readonly greeterService: GreeterService){}

    @Get()
    async findAllSetGreetings(): Promise<Greeter[]> {
        return this.greeterService.getAllSetGreetings()
    }

    @Get('/test')
    async findAllTests(): Promise<Greeter[]> {
        return this.greeterService.getAllTest()
    }

}