import { Context, Schema } from '@koishijs/core';
export interface Config {
    autoRestart?: boolean;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
}
export declare const Config: Schema<Config>;
export declare const name = "daemon";
export declare function apply(ctx: Context, config?: Config): void;
