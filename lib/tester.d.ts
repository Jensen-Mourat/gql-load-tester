import { ApolloClientOptions } from '@apollo/client/core/ApolloClient';
import { MutationOptions, QueryOptions } from '@apollo/client/core/watchQueryOptions';
interface Query extends QueryOptions {
}
interface PollingQuery extends Query {
    timer: number;
    stopOnError?: boolean;
}
interface Mutation extends MutationOptions {
}
interface ApolloConfig extends Omit<ApolloClientOptions<any>, 'cache'> {
}
interface Scenario {
    initialPollingQueries?: PollingQuery[];
    steps: Step[];
    runtime: number;
    repeat: number;
    deferBy?: number;
}
interface Step {
    query?: Query;
    mutation?: Mutation;
    pollingQuery?: PollingQuery[];
    name: string;
}
export declare const ApolloLoadTester: ({ apolloConfig, scenario }: {
    apolloConfig: ApolloConfig;
    scenario: Scenario;
}) => void;
export {};
