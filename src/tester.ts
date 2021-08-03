import {ApolloClient, DocumentNode, HttpLink, InMemoryCache} from '@apollo/client/core';
import {ApolloClientOptions} from '@apollo/client/core/ApolloClient';
import fetch from 'cross-fetch';
import {MutationOptions, QueryOptions} from '@apollo/client/core/watchQueryOptions';
import {interval, lastValueFrom, mergeMap, observable, Observable, scan, Subscriber, switchMap, tap, timer} from 'rxjs';
import {Log, Logger} from './logger';
import {CountDown} from './counter';
import { spawn, Thread, Worker } from "threads"
import {ProcessScenario} from './workers/processScenario';


interface Query extends QueryOptions {

}

interface PollingQuery extends Query{
    timer: number // milliseconds
}

interface Mutation extends MutationOptions {}

interface ApolloConfig extends Omit<ApolloClientOptions<any>, 'cache'> {}

interface Scenario {
    initialPollingQueries?: PollingQuery[]
    steps: Step[];
    repeat?: number;
    runtime?: number;
    gradualIncreaseRate?:number;
    deferBy?: number;
}

interface Step {
    query?: Query,
    mutation?: Mutation,
    pollingQuery?: PollingQuery[],
    name: string;
    wait?: number;
}



const cache = new InMemoryCache();

export const LoadTester = ({apolloConfig, scenario} :{apolloConfig: ApolloConfig, scenario: Scenario}) => {
    const uri = apolloConfig.uri;
    const repeat = scenario.repeat ?? 1;
    const logger = new Logger();
    const counter = new CountDown(repeat, () => {
        logger.print();
        process.exit(0)
    })
    for (let i = 0; i < repeat; i++){
        spawn<ProcessScenario>(new Worker("./workers/processScenario.ts"))
            .then(w => {
                    w.process({scenario, uri: uri as string, apolloConfig})
                        .then((value: Log[]) => {
                            value.forEach(v => logger.logCall(v));
                            counter.next();
                            Thread.terminate(w);
                        });
                }
            )

        // if(scenario.runtime){
        //     timer(scenario.runtime).subscribe(_ => counter.next())
        // }
        // if(scenario.deferBy){
        //     timer(scenario.deferBy * i).pipe(
        //         tap(_ => processScenario({scenario,uri: uri as string,apolloConfig}).then((value) => {
        //             value.forEach(v => logger.logCall(v))
        //             counter.next();
        //         }))
        //     ).subscribe()
        // }else{
        //     processScenario({scenario,uri: uri as string,apolloConfig}).then((value) => {
        //         value.forEach(v => logger.logCall(v))
        //         counter.next();
        //     })
        // }
    }
}

export const recursiveSteps = ({steps, client, stopAfterSteps, observer}: { steps: Step[], client: ApolloClient<any>, stopAfterSteps?: boolean,observer: Subscriber<Log> }) => {
    if(steps.length > 0){
        const [step, ...tail] = steps;
        if(step.pollingQuery && step.pollingQuery.length > 0){
            step.pollingQuery
                .forEach(sp => runPollingQuery({pollingQuery: sp, stepName: step.name, client, observer}));
        }
        if(step.query || step.mutation){
            if(step.query && step.mutation){
                console.log('Error: A step can only have one type of request, step: ', step.name)
            } else{
                runRequest(step.query ?? step.mutation!, step.query ? 'query' : 'mutation', step.name, client)
                    .then((v) => {
                        observer.next(v)
                        if(step.wait){
                            timer(step.wait).subscribe(_ =>
                                recursiveSteps({steps: tail, client, stopAfterSteps, observer}))
                        } else{
                            recursiveSteps({steps: tail, client, stopAfterSteps, observer});
                        }
                    })
            }
        } else {
            if(!step.pollingQuery || step.pollingQuery.length === 0){
                console.log('Error: add a query, mutation or polling query to the step: ', step.name)
            }
        }
    }else if(stopAfterSteps){
        observer.complete()
    }
}

export const processScenario = ({scenario, uri, apolloConfig}: {scenario: Scenario, uri: string, apolloConfig: ApolloConfig}) => {
    const client = new ApolloClient({cache, link: new HttpLink({ uri, fetch, headers: apolloConfig.headers }), ...apolloConfig});
    const scenario$ = new Observable<Log>((observer) => {
        if(scenario.initialPollingQueries && scenario.initialPollingQueries.length > 0){
            console.log('starting initial polling');
            scenario.initialPollingQueries?.forEach(p => runPollingQuery({pollingQuery: p,stepName: 'Initial Polling', client, observer}))
        }
        if(scenario.steps.length > 0){
            recursiveSteps({steps:scenario.steps, client, stopAfterSteps:  !scenario.runtime, observer});
        }
    })
    return lastValueFrom(scenario$.pipe(scan((a: Log[], c: Log) => [...a, c], [])));
}
 export const runPollingQuery = ({pollingQuery, stepName, client, observer} : { pollingQuery: PollingQuery, stepName: string, client: ApolloClient<any>, observer: Subscriber<Log>}) => {
    return interval(pollingQuery.timer)
        .pipe(
            mergeMap(() => runRequest(pollingQuery, 'query', stepName, client)),
            tap(v => observer.next(v))
        ).subscribe()
}

export const runRequest = (request: Query | Mutation, type: 'query' | 'mutation', stepName: string, client: ApolloClient<any>): Promise<Log> => {
    const initialTime = Date.now();
    let name = '';
    const gqlRequest = () => {
        switch (type){
            case 'query':
                // @ts-ignore
                name = (request as Query).query.definitions[0].name.value;
                return  client.query({fetchPolicy:'network-only', ...request as Query})
            case 'mutation':
                // @ts-ignore
                name = (request as Mutation).mutation.definitions[0].name.value;
                return client.mutate(request as Mutation)
        }
    }
    return new Promise<Log>((resolve => {
        gqlRequest()
            .then(v => {
                const time = calculateTimeElapsed(initialTime);
                const log: Log = {stepName, callName: name, time, type: 'success'}
                console.log(`${type} "${name}" completed, elapsed time: ${time}ms`);
                resolve(log)
            })
            .catch((e: Error) => {
                const time = calculateTimeElapsed(initialTime);
                const log: Log = {stepName, callName: name, time, type: 'failed', data: {message: e.message, stack: e.stack, name: name}}
                console.log(`Error ${type}: "${name}" , elapsed time: ${time}ms`);
                resolve(log)
            });
    }))
}

const calculateTimeElapsed = (start: number) => {
    return (Date.now() - start)
}



