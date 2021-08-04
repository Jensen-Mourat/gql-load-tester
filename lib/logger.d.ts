export interface Log {
    stepName: string;
    callName: string;
    time: number;
    type: 'failed' | 'success';
    data?: any;
}
export declare class Logger {
    private map;
    private pBar;
    private total;
    logCall({ stepName, callName, time, type, data }: Log): void;
    print(): void;
    private getAverage;
    startBar(): void;
    updateBar(num: number, payload: string, type: 'inc' | 'set'): void;
}
