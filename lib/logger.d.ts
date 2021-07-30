export declare class Logger {
    private map;
    logCall(stepname: string, callname: string, time: number, type: 'failed' | 'success'): void;
    print(): void;
    private getAverage;
}
