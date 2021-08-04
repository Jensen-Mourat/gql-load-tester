import {ApolloClient, ApolloError, DocumentNode, HttpLink, InMemoryCache} from '@apollo/client/core';
import {ApolloClientOptions} from '@apollo/client/core/ApolloClient';
import fetch from 'cross-fetch';
import {MutationOptions, QueryOptions} from '@apollo/client/core/watchQueryOptions';
import {interval, lastValueFrom, mergeMap, observable, Observable, scan, Subscriber, switchMap, tap, timer} from 'rxjs';
import {Log, Logger} from './logger';
import {CountDown} from './counter';
import { spawn, Thread, Worker} from "threads";
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
}

interface Step {
    query?: Query,
    mutation?: Mutation,
    pollingQuery?: PollingQuery[],
    name: string;
    wait?: number;
}

interface ILoadTester {
    apolloConfig: ApolloConfig;
    duration?: number;
    scenario: Scenario;
    parallelUsers: number;
}

const displayLog = false;

export const loadTester = ({apolloConfig, scenario, duration , parallelUsers} : ILoadTester) => {
    if(duration! < 1){
        throw new Error('Duration cannot be less than 1 second')
    } else if(duration) {
        duration = duration * 1000
    }
    const uri = apolloConfig.uri;
    const repeat = parallelUsers ?? 1;
    const logger = new Logger();
    logger.startBar();
    const counter = new CountDown(repeat, () => {
        logger.updateBar(100, 'done, processing data', 'set')
        timer(2000).subscribe(_ => {
            logger.print();
            process.exit(0);
        })
    })
    let durationDone = false;
    consoleLog('spawning workers');
    logger.updateBar(10, 'spawning worker threads', 'inc');
    const spawnWorker = () => {
        spawn<ProcessScenario>(new Worker("./workers/processScenario"), {timeout: 500000})
            .then((w) => {
                    workerTask(w)
                }
            )
    }
    const workerTask = (w: any) => {
        w.process({scenario, uri: uri as string, apolloConfig})
            .then((value: Log[]) => {
                value.forEach(v => logger.logCall(v));
                if(!duration){
                    logger.updateBar((1 / repeat) *  100, 'Worker: Scenario complete, closing thread', 'inc')
                    counter.decrease();
                    Thread.terminate(w);
                } else {
                    if(durationDone){
                        logger.updateBar((1 / repeat) *  100, 'Worker: Scenario complete, closing thread', 'inc')
                        counter.decrease();
                        Thread.terminate(w);
                    } else {
                        logger.updateBar(1 , 'Worker: Scenario complete, simulating new scenario', 'inc')
                        workerTask(w)
                    }
                }
            })
            .catch((e: any) => {
                if(!duration){
                    logger.updateBar((1 / repeat) *  100, 'Worker: Error, closing thread', 'inc')
                    counter.decrease();
                    Thread.terminate(w);
                } else {
                    if(durationDone){
                        logger.updateBar((1 / repeat) *  100, 'Worker: Error, closing thread', 'inc')
                        counter.decrease();
                        Thread.terminate(w);
                    } else {
                        logger.updateBar(1 , 'Worker: Scenario complete, simulating new scenario', 'inc')
                        workerTask(w)
                    }
                }
            });
    }
    if(duration){
        timer(duration).subscribe(_ => durationDone = true )
    }
    for (let i = 0; i < repeat; i++){
        spawnWorker()
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

export const recursiveSteps = ({steps, client, observer}: { steps: Step[], client: ApolloClient<any>,observer: Subscriber<Log> }) => {
    if(steps.length > 0){
        const [step, ...tail] = steps;
        if(step.pollingQuery && step.pollingQuery.length > 0){
            step.pollingQuery
                .forEach(sp => runPollingQuery({pollingQuery: sp, stepName: step.name, client, observer}));
        }
        if(step.query || step.mutation){
            if(step.query && step.mutation){
                consoleLog('Error: A step can only have one type of request, step: ', step.name)
            } else{
                runRequest(step.query ?? step.mutation!, step.query ? 'query' : 'mutation', step.name, client)
                    .then((v) => {
                        observer.next(v)
                        if(step.wait){
                            timer(step.wait).subscribe(_ =>
                                recursiveSteps({steps: tail, client, observer}))
                        } else{
                            recursiveSteps({steps: tail, client, observer});
                        }
                    })
            }
        } else {
            if(!step.pollingQuery || step.pollingQuery.length === 0){
                consoleLog('Error: add a query, mutation or polling query to the step: ', step.name)
            }
        }
    } else{
        observer.complete();
    }
}

export const processScenario = ({scenario, uri, apolloConfig}: {scenario: Scenario, uri: string, apolloConfig: ApolloConfig}) => {
    const cache = new InMemoryCache();
    const client = new ApolloClient({cache, link: new HttpLink({ uri, fetch, headers: apolloConfig.headers }), ...apolloConfig});
    const scenario$ = new Observable<Log>((observer) => {
        if(scenario.initialPollingQueries && scenario.initialPollingQueries.length > 0){
            consoleLog('starting initial polling');
            scenario.initialPollingQueries?.forEach(p => runPollingQuery({pollingQuery: p,stepName: 'Initial Polling', client, observer}))
        }
        if(scenario.steps.length > 0){
            recursiveSteps({steps:scenario.steps, client, observer});
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
                consoleLog(`${type} "${name}" completed, elapsed time: ${time}ms`);
                resolve(log)
            })
            .catch(({graphQLErrors,
                        message,
                        extraInfo,
                        networkError}: ApolloError) => {
                const time = calculateTimeElapsed(initialTime);
                const log: Log = {stepName, callName: name, time, type: 'failed', data: {callName: name, stepName, graphQLErrors, message, extraInfo, networkError: {name: networkError?.name, message: networkError?.message, stack: networkError?.stack}}}
                consoleLog(`Error ${type}: "${name}" , elapsed time: ${time}ms`);
                resolve(log)
            });
    }))
}

export const calculateTimeElapsed = (start: number) => {
    return (Date.now() - start)
}

export const consoleLog = (...s: any[]) => {
    if(displayLog){
        console.log(s)
    }
}


