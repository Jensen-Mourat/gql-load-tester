"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Logger {
    constructor() {
        this.map = new Map();
    }
    logCall({ stepName, callName, time, type, data }) {
        let request = this.map.get(callName);
        if (!request) {
            request = {
                failed: type === 'failed' ? { num: 1, atStep: new Set([stepName]) } : { num: 0, atStep: new Set() },
                total: 1,
                success: type === 'success' ? { num: 1, atStep: new Set([stepName]) } : { num: 0, atStep: new Set() },
                time: [time],
                errors: data ? [data] : []
            };
            this.map.set(callName, request);
        }
        else {
            this.map.set(callName, {
                total: request.total + 1,
                time: [...request.time, time],
                failed: type === 'failed' ? { num: request.failed.num + 1, atStep: request.failed.atStep.add(stepName) } : { num: request.failed.num, atStep: request.failed.atStep },
                success: type === 'success' ? { num: request.success.num + 1, atStep: request.success.atStep.add(stepName) } : { num: request.success.num, atStep: request.success.atStep },
                errors: data ? [...request.errors, data] : request.errors
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
        let errors = false;
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
            if (value.errors.length > 0) {
                errors = true;
                if (!fs.existsSync(`${__dirname}${path.sep}errors`)) {
                    fs.mkdirSync(`${__dirname}${path.sep}errors`);
                }
                fs.writeFileSync(`${__dirname}${path.sep}errors${path.sep}${key.replace(' ', '')}-log.json`, JSON.stringify(value.errors, null, 2), { flag: 'w' });
            }
        }));
        if (errors) {
            console.log('');
            console.log(`There was some errors. To see the error logs please check ${__dirname}${path.sep}errors`);
        }
    }
    getAverage(time) {
        let totalTime = 0;
        time.forEach(t => totalTime += t);
        return (totalTime / time.length).toFixed(2);
    }
    startBar() {
    }
}
exports.Logger = Logger;
