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

export const filteredSubscriptionsQuery: RequestDocument = gql`
    query Subscriptions($currentTimestamp: Int!, $balance: String) {
        autoSubscriptions(
            where: { amount: $balance }
        ) {
            id
            amount
            timeInterval
            lastPayment
        }
    }
`;