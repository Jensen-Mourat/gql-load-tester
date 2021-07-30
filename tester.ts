import {ApolloClient, DocumentNode, HttpLink, InMemoryCache} from '@apollo/client/core';
import {ApolloClientOptions} from '@apollo/client/core/ApolloClient';
import fetch from 'cross-fetch';
import {MutationOptions, QueryOptions} from '@apollo/client/core/watchQueryOptions';
import {interval, tap, timer} from 'rxjs';
import {Logger} from './logger';
import {CountDown} from './counter';

interface Query extends QueryOptions {

}

interface PollingQuery extends Query{
    timer: number // milliseconds
    stopOnError?: boolean;
}

interface Mutation extends MutationOptions {}

interface ApolloConfig extends Omit<ApolloClientOptions<any>, 'cache'> {
}

interface Scenario {
    initialPollingQueries?: PollingQuery[]
    steps: Step[];
    runtime: number;
    repeat: number;
    deferBy?: number;
}

interface Step {
    query?: Query,
    mutation?: Mutation,
    pollingQuery?: PollingQuery[],
    name: string;
}



const cache = new InMemoryCache();

export const ApolloLoadTester = ({apolloConfig, scenario} :{apolloConfig: ApolloConfig, scenario: Scenario}) => {
    const uri = apolloConfig.uri;
    const client = new ApolloClient({cache, link: new HttpLink({ uri, fetch, headers: apolloConfig.headers }), ...apolloConfig});
    const repeat = scenario.repeat ?? 1;
    const logger = new Logger();
    const counter = new CountDown(repeat, () => {
        logger.print();
        process.exit(0)
    })

    const runRequest = (request: Query | Mutation, type: 'query' | 'mutation', stepName: string) => {
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
        return new Promise<void>((resolve => {
            gqlRequest()
                .then(v => {
                    const time = calculateTimeElapsed(initialTime);
                    logger.logCall(stepName, name, time, 'success')
                    console.log(`${type} "${name}" completed, elapsed time: ${time}ms`);
                    resolve()
                })
                .catch(e => {
                    const time = calculateTimeElapsed(initialTime);
                    logger.logCall(stepName, name, time, 'failed')
                    console.log(`Error ${type}: "${name}" , elapsed time: ${time}ms`);
                    resolve()
                });
        }))

    }

    const runPollingQuery = (pollingQuery: PollingQuery, stepName: string) => {
       interval(pollingQuery.timer)
           .pipe(
               tap(() => runRequest(pollingQuery, 'query', stepName))
           ).subscribe()
    }

    const recursiveSteps = (steps: Step[]) => {
        if(steps.length > 0){
            const [step, ...tail] = steps;
            if(step.pollingQuery && step.pollingQuery.length > 0){
                step.pollingQuery.forEach(sp => runPollingQuery(sp, step.name))
            }
            if(step.query || step.mutation){
                if(step.query){
                    if(step.mutation){
                        console.log('A step can only have one type of request, step: ', step.name)
                    } else{
                        runRequest(step.query, 'query', step.name).then(() => recursiveSteps(tail))
                    }
                }
                if(step.mutation){
                    if(step.query){
                        console.log('A step can only have one type of request, step: ', step.name)
                    } else{
                        runRequest(step.mutation, 'mutation', step.name).then(() => recursiveSteps(tail))
                    }
                }
            } else {
                console.log('add a query or mutation to the step: ', step.name)
            }
        }
    }

    const processScenario = () => {
        timer(scenario.runtime).subscribe(_ => counter.next())
        if(scenario.initialPollingQueries && scenario.initialPollingQueries.length > 0){
            console.log('starting initial polling');
            scenario.initialPollingQueries?.forEach(p => runPollingQuery(p, 'Initial Polling'))
        }
        if(scenario.steps.length > 0){
            recursiveSteps(scenario.steps);
        }
    }

    for (let i = 0; i < repeat; i++){
        if(scenario.deferBy){
            timer(scenario.deferBy * i).subscribe(_ => {
                processScenario()
            })
        }else{
            processScenario();
        }

    }
}



const calculateTimeElapsed = (start: number) => {
    return (Date.now() - start)
}



