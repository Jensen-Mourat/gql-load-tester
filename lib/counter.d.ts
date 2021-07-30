export declare class CountDown {
    private takeUntil;
    private done;
    constructor(num: number, whenDone: Function);
    next(): void;
}
