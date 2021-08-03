export interface Log {
    stepName: string;
    callName: string;
    time: number;
    type: 'failed' | 'success';
}
export declare class Logger {
    private map;
    logCall({ stepName, callName, time, type }: Log): void;
    print(): void;
    private getAverage;
}
