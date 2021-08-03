"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor() {
        this.map = new Map();
    }
    logCall({ stepName, callName, time, type }) {
        let request = this.map.get(callName);
        if (!request) {
            request = {
                failed: type === 'failed' ? { num: 1, atStep: new Set([stepName]) } : { num: 0, atStep: new Set() },
                total: 1,
                success: type === 'success' ? { num: 1, atStep: new Set([stepName]) } : { num: 0, atStep: new Set() },
                time: [time]
            };
            this.map.set(callName, request);
        }
        else {
            this.map.set(callName, {
                total: request.total + 1,
                time: [...request.time, time],
                failed: type === 'failed' ? { num: request.failed.num + 1, atStep: request.failed.atStep.add(stepName) } : { num: request.failed.num, atStep: request.failed.atStep },
                success: type === 'success' ? { num: request.success.num + 1, atStep: request.success.atStep.add(stepName) } : { num: request.success.num, atStep: request.success.atStep },
            });
        }
    }
    //
    // print(){
    //     // console.log('final', this.map.get('me')?.failed.atStep)
    // }
    print() {
        let totalCalls = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        this.map.forEach(((value) => {
            totalCalls += value.total;
            totalSuccess += value.success.num;
            totalFailed += value.failed.num;
        }));
        console.log('');
        console.log('Total Calls: ', totalCalls);
        console.log('Successful Calls: ', totalSuccess);
        console.log('Failed Calls: ', totalFailed);
        this.map.forEach(((value, key) => {
            console.log('');
            console.log('Call: ', key);
            console.log(' Total: ', value.total);
            console.log(' Successful: ', value.success.num);
            console.log('   Success at step: ', Array.from(value.success.atStep));
            console.log(' Failed: ', value.failed.num);
            console.log('   Failed at step: ', Array.from(value.failed.atStep));
            console.log(' Average call time: ', this.getAverage(value.time) + 'ms');
        }));
    }
    getAverage(time) {
        let totalTime = 0;
        time.forEach(t => totalTime += t);
        return totalTime / time.length;
    }
}
exports.Logger = Logger;
