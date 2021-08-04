export interface Log {
    stepName: string;
    callName: string;
    time: number;
    type: 'failed' | 'success';
    data?: any;
}
export declare class Logger {
    private map;
    logCall({ stepName, callName, time, type, data }: Log): void;
    print(): void;
    private getAverage;
    private startBar;
}
