import { Context, Dict, EffectScope, ForkScope, Logger } from '@koishijs/core';
declare module '@koishijs/core' {
    interface Events {
        'config'(): void;
        'exit'(signal: NodeJS.Signals): Promise<void>;
    }
    interface Context {
        loader: Loader;
    }
    namespace Context {
        interface Config {
            name?: string;
            plugins?: Dict;
        }
    }
    interface EnvData {
        message?: StartMessage;
        startTime?: number;
    }
}
interface StartMessage {
    isDirect?: boolean;
    channelId?: string;
    guildId?: string;
    sid?: string;
    content: string;
}
declare module '@cordisjs/core' {
    interface EffectScope<C> {
        [Loader.kRecord]?: Dict<ForkScope<C>>;
        key?: string;
    }
}
export declare function unwrapExports(module: any): any;
export declare abstract class Loader {
    static readonly kRecord: unique symbol;
    static readonly exitCode = 51;
    static readonly extensions: Set<string>;
    baseDir: string;
    envData: any;
    params: {
        env: NodeJS.ProcessEnv;
    };
    app: Context;
    config: Context.Config;
    entry: Context;
    suspend: boolean;
    writable: boolean;
    mime: string;
    filename: string;
    envFiles: string[];
    names: Set<string>;
    cache: Dict<string>;
    prolog: Logger.Record[];
    private store;
    private _writeTask?;
    private _writeSlient;
    abstract import(name: string): Promise<any>;
    abstract fullReload(code?: number): void;
    constructor();
    init(filename?: string): Promise<void>;
    private findConfig;
    protected migrateEntry(name: string, config: any): any;
    migrate(): Promise<void>;
    readConfig(initial?: boolean): Promise<Context.Config>;
    private _writeConfig;
    writeConfig(silent?: boolean): Promise<void>;
    interpolate(source: any): any;
    resolve(name: string): Promise<any>;
    keyFor(plugin: any): string;
    replace(oldKey: any, newKey: any): void;
    private forkPlugin;
    isTruthyLike(expr: any): boolean;
    private logUpdate;
    reload(parent: Context, key: string, source: any): Promise<import("cordis").ForkScope<Context>>;
    unload(ctx: Context, key: string): void;
    getRefName(fork: ForkScope): string;
    /** @deprecated */
    resolvePlugin(name: string): Promise<any>;
    /** @deprecated */
    reloadPlugin(ctx: Context, key: string, source: any): Promise<import("cordis").ForkScope<Context>>;
    /** @deprecated */
    unloadPlugin(ctx: Context, key: string): void;
    paths(scope: EffectScope): string[];
    createApp(): Promise<Context>;
}
export default Loader;
