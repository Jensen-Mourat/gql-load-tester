"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountDown = void 0;
const rxjs_1 = require("rxjs");
class CountDown {
    constructor(num, whenDone) {
        this.takeUntil = 0;
        this.done = new rxjs_1.Subject();
        if (num > 0) {
            this.takeUntil = num;
        }
        else {
            console.log('CountDownSubject: inital value should be greater than 0');
        }
        this.done.subscribe(_ => whenDone());
    }
    next() {
        this.takeUntil--;
        if (this.takeUntil < 1) {
            this.done.next();
        }
    }
}
exports.CountDown = CountDown;
