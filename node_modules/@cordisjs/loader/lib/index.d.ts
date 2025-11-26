import * as yaml from 'js-yaml';
import { LoadHookContext } from 'module';
import { Dict } from 'cosmokit';
import { Context, ForkScope, Inject, EffectScope } from '@cordisjs/core';
type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
type ModuleSource = string | ArrayBuffer;
declare interface ResolveResult {
    format: ModuleFormat;
    url: string;
}
declare interface LoadResult {
    format: ModuleFormat;
    source?: ModuleSource;
}
type LoadCacheData = ModuleJob;
declare interface LoadCache extends Omit<Map<string, Dict<LoadCacheData>>, 'get' | 'set' | 'has'> {
    get(url: string, type?: string): LoadCacheData | undefined;
    set(url: string, type?: string, job?: LoadCacheData): this;
    has(url: string, type?: string): boolean;
}
export interface ModuleWrap {
    url: string;
    getNamespace(): any;
}
export interface ModuleJob {
    url: string;
    loader: ModuleLoader;
    module?: ModuleWrap;
    importAttributes: ImportAttributes;
    linked: Promise<ModuleJob[]>;
    instantiate(): Promise<void>;
    run(): Promise<{
        module: ModuleWrap;
    }>;
}
export interface ModuleLoader {
    loadCache: LoadCache;
    import(specifier: string, parentURL: string, importAttributes: ImportAttributes): Promise<any>;
    register(specifier: string | URL, parentURL?: string | URL, data?: any, transferList?: any[]): void;
    getModuleJob(specifier: string, parentURL: string, importAttributes: ImportAttributes): Promise<ModuleJob>;
    getModuleJobSync(specifier: string, parentURL: string, importAttributes: ImportAttributes): ModuleJob;
    resolve(originalSpecifier: string, parentURL: string, importAttributes: ImportAttributes): Promise<ResolveResult>;
    resolveSync(originalSpecifier: string, parentURL: string, importAttributes: ImportAttributes): ResolveResult;
    load(specifier: string, context: Pick<LoadHookContext, 'format' | 'importAttributes'>): Promise<LoadResult>;
    loadSync(specifier: string, context: Pick<LoadHookContext, 'format' | 'importAttributes'>): LoadResult;
}
export abstract class EntryTree<C extends Context = Context> {
    ctx: C;
    static readonly sep = ":";
    url: string;
    root: EntryGroup;
    store: Dict<Entry<C>>;
    constructor(ctx: C);
    get context(): Context;
    entries(): Generator<Entry<C>, void, void>;
    ensureId(options: Partial<EntryOptions>): string;
    resolve(id: string): Entry<Context>;
    resolveGroup(id: string | null): EntryGroup;
    create(options: Omit<EntryOptions, 'id'>, parent?: string | null, position?: number): Promise<string>;
    remove(id: string): void;
    update(id: string, options: Omit<EntryOptions, 'id' | 'name'>, parent?: string | null, position?: number): Promise<void>;
    import(name: string): Promise<any>;
    abstract write(): void;
}
export class EntryGroup {
    ctx: Context;
    tree: EntryTree;
    static readonly key: unique symbol;
    data: EntryOptions[];
    constructor(ctx: Context, tree: EntryTree);
    create(options: Omit<EntryOptions, 'id'>): Promise<string>;
    unlink(options: EntryOptions): void;
    remove(id: string): void;
    update(config: EntryOptions[]): void;
    stop(): void;
}
export class Group extends EntryGroup {
    ctx: Context;
    static reusable: boolean;
    static initial: Omit<EntryOptions, 'id'>[];
    static readonly [EntryGroup.key] = true;
    constructor(ctx: Context);
}
export const evaluate: ((ctx: object, expr: string) => any);
export function interpolate(ctx: object, value: any): any;
export interface JsExpr {
    __jsExpr: string;
}
export const JsExpr: yaml.Type;
export interface EntryOptions {
    id: string;
    name: string;
    config?: any;
    group?: boolean | null;
    disabled?: boolean | null;
}
export interface EntryUpdateMeta {
}
export class Entry<C extends Context = Context> {
    loader: Loader<C>;
    static readonly key: unique symbol;
    ctx: C;
    fork?: ForkScope<C>;
    suspend: boolean;
    parent: EntryGroup;
    options: EntryOptions;
    subgroup?: EntryGroup;
    subtree?: EntryTree<C>;
    constructor(loader: Loader<C>);
    get context(): Context;
    get id(): string;
    get disabled(): boolean;
    _check(): boolean;
    evaluate(expr: string): any;
    _resolveConfig(plugin: any): [any, any?];
    patch(options?: Partial<EntryOptions>): void;
    refresh(): Promise<void>;
    update(options: Partial<EntryOptions>, override?: boolean): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export class ImportTree<C extends Context = Context> extends EntryTree<C> {
    ctx: C;
    static reusable: boolean;
    file: LoaderFile;
    constructor(ctx: C);
    start(): Promise<void>;
    refresh(): Promise<void>;
    stop(): void;
    write(): void;
    init(baseDir: string, options: Loader.Config): Promise<void>;
    private _init;
}
export namespace Import {
    interface Config {
        url: string;
    }
}
export class Import extends ImportTree {
    config: Import.Config;
    constructor(ctx: Context, config: Import.Config);
    start(): Promise<void>;
}
export const schema: yaml.Schema;
export class LoaderFile {
    name: string;
    type?: string | undefined;
    suspend: boolean;
    readonly: boolean;
    trees: ImportTree[];
    writeTask?: NodeJS.Timeout;
    constructor(name: string, type?: string | undefined);
    ref(tree: ImportTree): void;
    unref(tree: ImportTree): void;
    checkAccess(): Promise<void>;
    read(): Promise<EntryOptions[]>;
    private _write;
    write(config: EntryOptions[]): void;
}
export namespace LoaderFile {
    const writable: {
        '.json': string;
        '.yaml': string;
        '.yml': string;
    };
    const supported: Set<string>;
}
export interface EntryOptions {
    inject?: Inject | null;
}
export const name = "inject";
export function apply(ctx: Context): void;
export interface EntryUpdateMeta {
    newMap: Dict<symbol>;
    diff: [string, symbol, symbol, symbol, symbol][];
}
export interface EntryOptions {
    intercept?: Dict | null;
    isolate?: Dict<true | string> | null;
}
export interface Entry {
    realm: LocalRealm;
}
export abstract class Realm {
    protected store: Dict<symbol>;
    abstract get suffix(): string;
    access(key: string, create?: boolean): symbol;
    delete(key: string): void;
    get size(): number;
}
export class LocalRealm extends Realm {
    private entry;
    constructor(entry: Entry);
    get suffix(): string;
}
export class GlobalRealm extends Realm {
    label: string;
    constructor(label: string);
    get suffix(): string;
}
export const name = "isolate";
export function apply(ctx: Context): void;
declare module '@cordisjs/core' {
    interface Events {
        'exit'(signal: NodeJS.Signals): Promise<void>;
        'loader/config-update'(): void;
        'loader/entry-init'(entry: Entry): void;
        'loader/entry-fork'(entry: Entry, type: string): void;
        'loader/entry-check'(entry: Entry): boolean | undefined;
        'loader/partial-dispose'(entry: Entry, legacy: Partial<EntryOptions>, active: boolean): void;
        'loader/before-patch'(this: EntryUpdateMeta, entry: Entry): void;
        'loader/after-patch'(this: EntryUpdateMeta, entry: Entry): void;
    }
    interface Context {
        baseDir: string;
        loader: Loader<this>;
    }
    interface EnvData {
        startTime?: number;
    }
    interface EffectScope {
        entry?: Entry;
    }
}
export namespace Loader {
    interface Config {
        name: string;
        initial?: Omit<EntryOptions, 'id'>[];
        filename?: string;
    }
}
export abstract class Loader<C extends Context = Context> extends ImportTree<C> {
    ctx: C;
    config: Loader.Config;
    static inject: {
        loader: {
            required: boolean;
        };
    };
    envData: any;
    params: {
        env: NodeJS.ProcessEnv;
    };
    files: Dict<LoaderFile>;
    delims: Dict<symbol>;
    internal?: ModuleLoader;
    constructor(ctx: C, config: Loader.Config);
    start(): Promise<void>;
    locate(ctx?: C): string[];
    _locate(scope: EffectScope<C>): Entry[];
    exit(): void;
    unwrapExports(exports: any): any;
}
declare namespace NodeLoader {
    interface Config extends Loader.Config {
    }
}
declare class NodeLoader extends Loader {
    static readonly exitCode = 51;
    init(baseDir: string, options: Loader.Config): Promise<void>;
    start(): Promise<void>;
    exit(code?: number): void;
}
export default NodeLoader;
