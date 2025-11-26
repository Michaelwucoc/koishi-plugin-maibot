import { Context } from '../index.ts';
export interface Config {
    execArgv?: string[];
    autoRestart?: boolean;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
}
export declare const name = "daemon";
export declare function apply(ctx: Context, config?: Config): void;
