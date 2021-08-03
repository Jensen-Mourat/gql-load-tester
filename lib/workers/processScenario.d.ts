declare const processScenarioParallel: {
    process(data: any): Promise<import("../logger").Log[]>;
};
export declare type ProcessScenario = typeof processScenarioParallel;
export {};
