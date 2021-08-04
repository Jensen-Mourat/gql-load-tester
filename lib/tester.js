"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleLog = exports.calculateTimeElapsed = exports.runRequest = exports.runPollingQuery = exports.processScenario = exports.recursiveSteps = exports.loadTester = void 0;
const core_1 = require("@apollo/client/core");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const rxjs_1 = require("rxjs");
const logger_1 = require("./logger");
const counter_1 = require("./counter");
const threads_1 = require("threads");
const displayLog = false;
const loadTester = ({ apolloConfig, scenario, duration, parallelUsers }) => {
    if (duration < 1) {
        throw new Error('Duration cannot be less than 1 second');
    }
    else if (duration) {
        duration = duration * 1000;
    }
    const uri = apolloConfig.uri;
    const repeat = parallelUsers !== null && parallelUsers !== void 0 ? parallelUsers : 1;
    const logger = new logger_1.Logger();
    logger.startBar();
    const counter = new counter_1.CountDown(repeat, () => {
        logger.updateBar(100, 'done, processing data', 'set');
        rxjs_1.timer(2000).subscribe(_ => {
            logger.print();
            process.exit(0);
        });
    });
    let durationDone = false;
    exports.consoleLog('spawning workers');
    logger.updateBar(10, 'spawning worker threads', 'inc');
    const spawnWorker = () => {
        threads_1.spawn(new threads_1.Worker("./workers/processScenario"), { timeout: 500000 })
            .then((w) => {
            workerTask(w);
        });
    };
    const workerTask = (w) => {
        w.process({ scenario, uri: uri, apolloConfig })
            .then((value) => {
            value.forEach(v => logger.logCall(v));
            if (!duration) {
                logger.updateBar((1 / repeat) * 100, 'Worker: Scenario complete, closing thread', 'inc');
                counter.decrease();
                threads_1.Thread.terminate(w);
            }
            else {
                if (durationDone) {
                    logger.updateBar((1 / repeat) * 100, 'Worker: Scenario complete, closing thread', 'inc');
                    counter.decrease();
                    threads_1.Thread.terminate(w);
                }
                else {
                    logger.updateBar(1, 'Worker: Scenario complete, simulating new scenario', 'inc');
                    workerTask(w);
                }
            }
        })
            .catch((e) => {
            if (!duration) {
                logger.updateBar((1 / repeat) * 100, 'Worker: Error, closing thread', 'inc');
                counter.decrease();
                threads_1.Thread.terminate(w);
            }
            else {
                if (durationDone) {
                    logger.updateBar((1 / repeat) * 100, 'Worker: Error, closing thread', 'inc');
                    counter.decrease();
                    threads_1.Thread.terminate(w);
                }
                else {
                    logger.updateBar(1, 'Worker: Scenario complete, simulating new scenario', 'inc');
                    workerTask(w);
                }
            }
        });
    };
    if (duration) {
        rxjs_1.timer(duration).subscribe(_ => durationDone = true);
    }
    for (let i = 0; i < repeat; i++) {
        spawnWorker();
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
};
exports.loadTester = loadTester;
const recursiveSteps = ({ steps, client, observer }) => {
    var _a;
    if (steps.length > 0) {
        const [step, ...tail] = steps;
        if (step.pollingQuery && step.pollingQuery.length > 0) {
            step.pollingQuery
                .forEach(sp => exports.runPollingQuery({ pollingQuery: sp, stepName: step.name, client, observer }));
        }
        if (step.query || step.mutation) {
            if (step.query && step.mutation) {
                exports.consoleLog('Error: A step can only have one type of request, step: ', step.name);
            }
            else {
                exports.runRequest((_a = step.query) !== null && _a !== void 0 ? _a : step.mutation, step.query ? 'query' : 'mutation', step.name, client)
                    .then((v) => {
                    observer.next(v);
                    if (step.wait) {
                        rxjs_1.timer(step.wait).subscribe(_ => exports.recursiveSteps({ steps: tail, client, observer }));
                    }
                    else {
                        exports.recursiveSteps({ steps: tail, client, observer });
                    }
                });
            }
        }
        else {
            if (!step.pollingQuery || step.pollingQuery.length === 0) {
                exports.consoleLog('Error: add a query, mutation or polling query to the step: ', step.name);
            }
        }
    }
    else {
        observer.complete();
    }
};
exports.recursiveSteps = recursiveSteps;
const processScenario = ({ scenario, uri, apolloConfig }) => {
    const cache = new core_1.InMemoryCache();
    const client = new core_1.ApolloClient(Object.assign({ cache, link: new core_1.HttpLink({ uri, fetch: cross_fetch_1.default, headers: apolloConfig.headers }) }, apolloConfig));
    const scenario$ = new rxjs_1.Observable((observer) => {
        var _a;
        if (scenario.initialPollingQueries && scenario.initialPollingQueries.length > 0) {
            exports.consoleLog('starting initial polling');
            (_a = scenario.initialPollingQueries) === null || _a === void 0 ? void 0 : _a.forEach(p => exports.runPollingQuery({ pollingQuery: p, stepName: 'Initial Polling', client, observer }));
        }
        if (scenario.steps.length > 0) {
            exports.recursiveSteps({ steps: scenario.steps, client, observer });
        }
    });
    return rxjs_1.lastValueFrom(scenario$.pipe(rxjs_1.scan((a, c) => [...a, c], [])));
};
exports.processScenario = processScenario;
const runPollingQuery = ({ pollingQuery, stepName, client, observer }) => {
    return rxjs_1.interval(pollingQuery.timer)
        .pipe(rxjs_1.mergeMap(() => exports.runRequest(pollingQuery, 'query', stepName, client)), rxjs_1.tap(v => observer.next(v))).subscribe();
};
exports.runPollingQuery = runPollingQuery;
const runRequest = (request, type, stepName, client) => {
    const initialTime = Date.now();
    let name = '';
    const gqlRequest = () => {
        switch (type) {
            case 'query':
                // @ts-ignore
                name = request.query.definitions[0].name.value;
                return client.query(Object.assign({ fetchPolicy: 'network-only' }, request));
            case 'mutation':
                // @ts-ignore
                name = request.mutation.definitions[0].name.value;
                return client.mutate(request);
        }
    };
    return new Promise((resolve => {
        gqlRequest()
            .then(v => {
            const time = exports.calculateTimeElapsed(initialTime);
            const log = { stepName, callName: name, time, type: 'success' };
            exports.consoleLog(`${type} "${name}" completed, elapsed time: ${time}ms`);
            resolve(log);
        })
            .catch(({ graphQLErrors, message, extraInfo, networkError }) => {
            const time = exports.calculateTimeElapsed(initialTime);
            const log = { stepName, callName: name, time, type: 'failed', data: { callName: name, stepName, graphQLErrors, message, extraInfo, networkError: { name: networkError === null || networkError === void 0 ? void 0 : networkError.name, message: networkError === null || networkError === void 0 ? void 0 : networkError.message, stack: networkError === null || networkError === void 0 ? void 0 : networkError.stack } } };
            exports.consoleLog(`Error ${type}: "${name}" , elapsed time: ${time}ms`);
            resolve(log);
        });
    }));
};
exports.runRequest = runRequest;
const calculateTimeElapsed = (start) => {
    return (Date.now() - start);
};
exports.calculateTimeElapsed = calculateTimeElapsed;
const consoleLog = (...s) => {
    if (displayLog) {
        console.log(s);
    }
};
exports.consoleLog = consoleLog;
