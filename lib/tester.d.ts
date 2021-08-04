import { ApolloClient } from '@apollo/client/core';
import { ApolloClientOptions } from '@apollo/client/core/ApolloClient';
import { MutationOptions, QueryOptions } from '@apollo/client/core/watchQueryOptions';
import { Subscriber } from 'rxjs';
import { Log } from './logger';
interface Query extends QueryOptions {
}
interface PollingQuery extends Query {
    timer: number;
}
interface Mutation extends MutationOptions {
}
interface ApolloConfig extends Omit<ApolloClientOptions<any>, 'cache'> {
}
interface Scenario {
    initialPollingQueries?: PollingQuery[];
    steps: Step[];
    gradualIncreaseRate?: number;
    deferBy?: number;
}
interface Step {
    query?: Query;
    mutation?: Mutation;
    pollingQuery?: PollingQuery[];
    name: string;
    wait?: number;
}
interface ILoadTester {
    apolloConfig: ApolloConfig;
    duration?: number;
    scenario: Scenario;
    parallelUsers: number;
}
export declare const loadTester: ({ apolloConfig, scenario, duration, parallelUsers }: ILoadTester) => void;
export declare const recursiveSteps: ({ steps, client, observer }: {
    steps: Step[];
    client: ApolloClient<any>;
    observer: Subscriber<Log>;
}) => void;
export declare const processScenario: ({ scenario, uri, apolloConfig }: {
    scenario: Scenario;
    uri: string;
    apolloConfig: ApolloConfig;
}) => Promise<Log[]>;
export declare const runPollingQuery: ({ pollingQuery, stepName, client, observer }: {
    pollingQuery: PollingQuery;
    stepName: string;
    client: ApolloClient<any>;
    observer: Subscriber<Log>;
}) => import("rxjs").Subscription;
export declare const runRequest: (request: Query | Mutation, type: 'query' | 'mutation', stepName: string, client: ApolloClient<any>) => Promise<Log>;
export declare const calculateTimeElapsed: (start: number) => number;
export declare const consoleLog: (...s: any[]) => void;
export {};
