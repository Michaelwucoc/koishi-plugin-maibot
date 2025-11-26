import { Logger } from '@cordisjs/logger';
import { Context } from '../index.ts';
declare module '@cordisjs/loader' {
    interface Loader {
        prolog: Logger.Record[];
    }
}
interface LogLevelConfig {
    base?: number;
    [K: string]: LogLevel | undefined;
}
type LogLevel = number | LogLevelConfig;
export interface Config {
    levels?: LogLevel;
    showDiff?: boolean;
    showTime?: string | boolean;
}
export declare const inject: string[];
export declare function apply(ctx: Context, config?: Config): void;
export {};
