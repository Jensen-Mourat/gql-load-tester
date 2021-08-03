import {processScenario} from '../tester';
import { expose } from "threads/worker"

const processScenarioParallel = {
    async process(data: any){
        const logs = await processScenario(data)
        return logs;
    }
}
export type ProcessScenario = typeof processScenarioParallel
expose(processScenarioParallel)

