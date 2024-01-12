import { gql, RequestDocument } from 'graphql-request';

export const subscriptionQuery: RequestDocument = gql`
    query MyQuery {
        autoSubscriptions {
            id
            amount
            timeInterval
            lastPayment
        }
    }
`;