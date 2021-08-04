import {Subject} from 'rxjs';

export class CountDown {
    private takeUntil = 0;
    private done = new Subject<void>();
    constructor(num: number, whenDone: Function) {
        if(num > 0){
            this.takeUntil = num;
        } else{
            console.log('CountDownSubject: inital value should be greater than 0')
        }
        this.done.subscribe(_ => whenDone())
    }

    decrease(){
        this.takeUntil --;
        if(this.takeUntil < 1){
            this.done.next()
        }
    }

    increase() {
        this.takeUntil ++;
    }
}
