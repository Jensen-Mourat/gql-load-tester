"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountDown = void 0;
var rxjs_1 = require("rxjs");
var CountDown = /** @class */ (function () {
    function CountDown(num, whenDone) {
        this.takeUntil = 0;
        this.done = new rxjs_1.Subject();
        if (num > 0) {
            this.takeUntil = num;
        }
        else {
            console.log('CountDownSubject: inital value should be greater than 0');
        }
        this.done.subscribe(function (_) { return whenDone(); });
    }
    CountDown.prototype.next = function () {
        this.takeUntil--;
        if (this.takeUntil < 1) {
            this.done.next();
        }
    };
    return CountDown;
}());
exports.CountDown = CountDown;
