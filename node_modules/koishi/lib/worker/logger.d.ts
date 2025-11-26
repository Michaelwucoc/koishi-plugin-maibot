import { Schema } from '@koishijs/core';
interface LogLevelConfig {
    base?: number;
    [K: string]: LogLevel;
}
type LogLevel = number | LogLevelConfig;
export interface Config {
    levels?: LogLevel;
    showDiff?: boolean;
    showTime?: string | boolean;
}
export declare const Config: Schema<Config>;
export declare function prepare(config?: Config): void;
export {};
