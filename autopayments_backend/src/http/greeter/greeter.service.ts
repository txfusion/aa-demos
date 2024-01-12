import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { GraphQLClient } from "graphql-request";
import { Greeter, Test } from "./entities/greeter.entity";
import { greeterQuery, testQuery } from "./queries/greeter.query";

const ZKSYNC_GRAPH_URI = "https://api.studio.thegraph.com/query/56765/greeter/v0.0.2"

@Injectable()
export class GreeterService {
    client: GraphQLClient
    constructor() {
        this.client = new GraphQLClient(ZKSYNC_GRAPH_URI);
    }

    async getAllSetGreetings(): Promise<Greeter[]> {
        try {
            const { greetingSets } = <{ greetingSets: Greeter[] }> (
                await this.client.request(greeterQuery)
            )
            console.log("Set greetings: ", greetingSets)

            return greetingSets
        } catch(e) {
            throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
        }
    }

    async getAllTest(): Promise<Test[]> {
        try {
            const { tests } = <{ tests: Test[] }> (
                await this.client.request(testQuery)
            )
            console.log("Set greetings: ", tests)

            return tests
        } catch(e) {
            throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
        }
    }
}