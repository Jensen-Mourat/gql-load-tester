"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadTester = void 0;
var core_1 = require("@apollo/client/core");
var cross_fetch_1 = __importDefault(require("cross-fetch"));
var rxjs_1 = require("rxjs");
var logger_1 = require("./logger");
var counter_1 = require("./counter");
var cache = new core_1.InMemoryCache();
var LoadTester = function (_a) {
    var _b;
    var apolloConfig = _a.apolloConfig, scenario = _a.scenario;
    var uri = apolloConfig.uri;
    var client = new core_1.ApolloClient(__assign({ cache: cache, link: new core_1.HttpLink({ uri: uri, fetch: cross_fetch_1.default, headers: apolloConfig.headers }) }, apolloConfig));
    var repeat = (_b = scenario.repeat) !== null && _b !== void 0 ? _b : 1;
    var logger = new logger_1.Logger();
    var counter = new counter_1.CountDown(repeat, function () {
        logger.print();
        process.exit(0);
    });
    var runRequest = function (request, type, stepName) {
        var initialTime = Date.now();
        var name = '';
        var gqlRequest = function () {
            switch (type) {
                case 'query':
                    // @ts-ignore
                    name = request.query.definitions[0].name.value;
                    return client.query(__assign({ fetchPolicy: 'network-only' }, request));
                case 'mutation':
                    // @ts-ignore
                    name = request.mutation.definitions[0].name.value;
                    return client.mutate(request);
            }
        };
        return new Promise((function (resolve) {
            gqlRequest()
                .then(function (v) {
                var time = calculateTimeElapsed(initialTime);
                logger.logCall(stepName, name, time, 'success');
                console.log(type + " \"" + name + "\" completed, elapsed time: " + time + "ms");
                resolve();
            })
                .catch(function (e) {
                var time = calculateTimeElapsed(initialTime);
                logger.logCall(stepName, name, time, 'failed');
                console.log("Error " + type + ": \"" + name + "\" , elapsed time: " + time + "ms");
                resolve();
            });
        }));
    };
    var runPollingQuery = function (pollingQuery, stepName) {
        rxjs_1.interval(pollingQuery.timer)
            .pipe(rxjs_1.tap(function () { return runRequest(pollingQuery, 'query', stepName); })).subscribe();
    };
    var recursiveSteps = function (steps) {
        if (steps.length > 0) {
            var step_1 = steps[0], tail_1 = steps.slice(1);
            if (step_1.pollingQuery && step_1.pollingQuery.length > 0) {
                step_1.pollingQuery.forEach(function (sp) { return runPollingQuery(sp, step_1.name); });
            }
            if (step_1.query || step_1.mutation) {
                if (step_1.query) {
                    if (step_1.mutation) {
                        console.log('A step can only have one type of request, step: ', step_1.name);
                    }
                    else {
                        runRequest(step_1.query, 'query', step_1.name).then(function () { return recursiveSteps(tail_1); });
                    }
                }
                if (step_1.mutation) {
                    if (step_1.query) {
                        console.log('A step can only have one type of request, step: ', step_1.name);
                    }
                    else {
                        runRequest(step_1.mutation, 'mutation', step_1.name).then(function () { return recursiveSteps(tail_1); });
                    }
                }
            }
            else {
                console.log('add a query or mutation to the step: ', step_1.name);
            }
        }
    };
    var processScenario = function () {
        var _a;
        rxjs_1.timer(scenario.runtime).subscribe(function (_) { return counter.next(); });
        if (scenario.initialPollingQueries && scenario.initialPollingQueries.length > 0) {
            console.log('starting initial polling');
            (_a = scenario.initialPollingQueries) === null || _a === void 0 ? void 0 : _a.forEach(function (p) { return runPollingQuery(p, 'Initial Polling'); });
        }
        if (scenario.steps.length > 0) {
            recursiveSteps(scenario.steps);
        }
    };
    for (var i = 0; i < repeat; i++) {
        if (scenario.deferBy) {
            rxjs_1.timer(scenario.deferBy * i).subscribe(function (_) {
                processScenario();
            });
        }
        else {
            processScenario();
        }
    }
};
exports.LoadTester = LoadTester;
var calculateTimeElapsed = function (start) {
    return (Date.now() - start);
};
