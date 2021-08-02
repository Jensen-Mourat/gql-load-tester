"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
var Logger = /** @class */ (function () {
    function Logger() {
        this.map = new Map();
    }
    Logger.prototype.logCall = function (stepname, callname, time, type) {
        var request = this.map.get(callname);
        if (!request) {
            request = {
                failed: type === 'failed' ? { num: 1, atStep: new Set([stepname]) } : { num: 0, atStep: new Set() },
                total: 1,
                success: type === 'success' ? { num: 1, atStep: new Set([stepname]) } : { num: 0, atStep: new Set() },
                time: [time]
            };
            this.map.set(callname, request);
        }
        else {
            this.map.set(callname, {
                total: request.total + 1,
                time: __spreadArray(__spreadArray([], request.time), [time]),
                failed: type === 'failed' ? { num: request.failed.num + 1, atStep: request.failed.atStep.add(stepname) } : { num: request.failed.num, atStep: request.failed.atStep },
                success: type === 'success' ? { num: request.success.num + 1, atStep: request.success.atStep.add(stepname) } : { num: request.success.num, atStep: request.success.atStep },
            });
        }
    };
    //
    // print(){
    //     // console.log('final', this.map.get('me')?.failed.atStep)
    // }
    Logger.prototype.print = function () {
        var _this = this;
        var totalCalls = 0;
        var totalSuccess = 0;
        var totalFailed = 0;
        this.map.forEach((function (value) {
            totalCalls += value.total;
            totalSuccess += value.success.num;
            totalFailed += value.failed.num;
        }));
        console.log('');
        console.log('Total Calls: ', totalCalls);
        console.log('Successful Calls: ', totalSuccess);
        console.log('Failed Calls: ', totalFailed);
        this.map.forEach((function (value, key) {
            console.log('');
            console.log('Call: ', key);
            console.log(' Total: ', value.total);
            console.log(' Successful: ', value.success.num);
            console.log('   Success at step: ', Array.from(value.success.atStep));
            console.log(' Failed: ', value.failed.num);
            console.log('   Failed at step: ', Array.from(value.failed.atStep));
            console.log(' Average call time: ', _this.getAverage(value.time) + 'ms');
        }));
    };
    Logger.prototype.getAverage = function (time) {
        var totalTime = 0;
        time.forEach(function (t) { return totalTime += t; });
        return totalTime / time.length;
    };
    return Logger;
}());
exports.Logger = Logger;
