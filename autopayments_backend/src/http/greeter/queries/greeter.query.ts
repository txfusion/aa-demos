import { gql, RequestDocument } from 'graphql-request';

export const greeterQuery: RequestDocument = gql`
    query MyQuery {
        greetingSets {
            id
            Greeting
        }
    }
`;

export const testQuery: RequestDocument = gql`
    query Test {
        tests {
            id
            Greeting
        }
    }
`;