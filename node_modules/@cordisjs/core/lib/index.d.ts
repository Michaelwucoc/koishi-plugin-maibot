import { Awaitable, Dict, Promisify } from 'cosmokit';
export abstract class Service<T = unknown, C extends Context = Context> {
    static readonly setup: unique symbol;
    static readonly invoke: unique symbol;
    static readonly extend: unique symbol;
    static readonly tracker: unique symbol;
    static readonly provide: unique symbol;
    static readonly immediate: unique symbol;
    protected start(): Awaitable<void>;
    protected stop(): Awaitable<void>;
    protected fork?(ctx: C, config: any): void;
    protected ctx: C;
    name: string;
    config: T;
    constructor(...args: Spread<T>);
    constructor(ctx: C, ...args: Spread<T>);
    constructor(ctx: C, name: string, immediate?: boolean);
    protected [symbols.filter](ctx: Context): boolean;
    protected [symbols.setup](): void;
    protected [symbols.extend](props?: any): any;
    static [Symbol.hasInstance](instance: any): boolean;
}
export interface Tracker {
    associate?: string;
    property?: string;
}
export const symbols: {
    shadow: symbol;
    receiver: symbol;
    original: symbol;
    store: typeof Context.store;
    events: typeof Context.events;
    static: typeof Context.static;
    filter: typeof Context.filter;
    expose: typeof Context.expose;
    isolate: typeof Context.isolate;
    internal: typeof Context.internal;
    intercept: typeof Context.intercept;
    setup: typeof Service.setup;
    invoke: typeof Service.invoke;
    extend: typeof Service.extend;
    tracker: typeof Service.tracker;
    provide: typeof Service.provide;
    immediate: typeof Service.immediate;
};
export function isConstructor(func: any): func is new (...args: any) => any;
export function resolveConfig(plugin: any, config: any): any;
export function isUnproxyable(value: any): boolean;
export function joinPrototype(proto1: {}, proto2: {}): any;
export function isObject(value: any): value is {};
export function getTraceable<T>(ctx: Context, value: T, noTrap?: boolean): T;
export function withProps(target: any, props?: {}): any;
export function createCallable(name: string, proto: {}, tracker: Tracker): any;
export type Inject = string[] | Dict<Inject.Meta>;
export function Inject(inject: Inject): (value: any, ctx: ClassDecoratorContext<any> | ClassMethodDecoratorContext<any>) => void;
export namespace Inject {
    interface Meta {
        required: boolean;
    }
    function resolve(inject: Inject | null | undefined): {
        [k: string]: {
            required: boolean;
        };
    };
}
export type Plugin<C extends Context = Context, T = any> = Plugin.Function<C, T> | Plugin.Constructor<C, T> | Plugin.Object<C, T>;
export namespace Plugin {
    interface Base<T = any> {
        name?: string;
        reactive?: boolean;
        reusable?: boolean;
        Config?: (config: any) => T;
        inject?: Inject;
        intercept?: Dict<boolean>;
    }
    interface Transform<S, T> {
        schema?: true;
        Config: (config: S) => T;
    }
    interface Function<C extends Context = Context, T = any> extends Base<T> {
        (ctx: C, config: T): void;
    }
    interface Constructor<C extends Context = Context, T = any> extends Base<T> {
        new (ctx: C, config: T): void;
    }
    interface Object<C extends Context = Context, T = any> extends Base<T> {
        apply: (ctx: C, config: T) => void;
    }
}
export type Spread<T> = undefined extends T ? [config?: T] : [config: T];
export interface Context {
    /** @deprecated use `ctx.inject()` instead */
    using(deps: Inject, callback: Plugin.Function<this, void>): ForkScope<this>;
    inject(deps: Inject, callback: Plugin.Function<this, void>): ForkScope<this>;
    plugin<T = undefined, S = T>(plugin: Plugin.Function<this, T> & Plugin.Transform<S, T>, ...args: Spread<S>): ForkScope<this>;
    plugin<T = undefined, S = T>(plugin: Plugin.Constructor<this, T> & Plugin.Transform<S, T>, ...args: Spread<S>): ForkScope<this>;
    plugin<T = undefined, S = T>(plugin: Plugin.Object<this, T> & Plugin.Transform<S, T>, ...args: Spread<S>): ForkScope<this>;
    plugin<T = undefined>(plugin: Plugin.Function<this, T>, ...args: Spread<T>): ForkScope<this>;
    plugin<T = undefined>(plugin: Plugin.Constructor<this, T>, ...args: Spread<T>): ForkScope<this>;
    plugin<T = undefined>(plugin: Plugin.Object<this, T>, ...args: Spread<T>): ForkScope<this>;
}
declare class Registry<C extends Context = Context> {
    ctx: C;
    private _counter;
    private _internal;
    protected context: Context;
    constructor(ctx: C, config: any);
    get counter(): number;
    get size(): number;
    resolve(plugin: Plugin, assert?: boolean): Function | undefined;
    get(plugin: Plugin): MainScope<C> | undefined;
    has(plugin: Plugin): boolean;
    set(plugin: Plugin, state: MainScope<C>): void;
    delete(plugin: Plugin): MainScope<C> | undefined;
    keys(): IterableIterator<Function>;
    values(): IterableIterator<MainScope<C>>;
    entries(): IterableIterator<[Function, MainScope<C>]>;
    forEach(callback: (value: MainScope<C>, key: Function, map: Map<Plugin, MainScope<C>>) => void): void;
    using(inject: Inject, callback: Plugin.Function<C, void>): ForkScope<C>;
    inject(inject: Inject, callback: Plugin.Function<C, void>): ForkScope<C>;
    plugin(plugin: Plugin<C>, config?: any, error?: any): ForkScope<C>;
}
export interface Context {
    scope: EffectScope<this>;
    runtime: MainScope<this>;
    effect<T extends DisposableLike>(callback: Callable<T, [ctx: this]>): T;
    effect<T extends DisposableLike, R>(callback: Callable<T, [ctx: this, config: R]>, config: R): T;
    /** @deprecated use `ctx.effect()` instead */
    collect(label: string, callback: () => void): () => void;
    accept(callback?: (config: this['config']) => void | boolean, options?: AcceptOptions): () => boolean;
    accept(keys: (keyof this['config'])[], callback?: (config: this['config']) => void | boolean, options?: AcceptOptions): () => boolean;
    decline(keys: (keyof this['config'])[]): () => boolean;
}
export type Disposable = () => void;
export type DisposableLike = Disposable | {
    dispose: Disposable;
};
export type Callable<T, R extends unknown[]> = ((...args: R) => T) | (new (...args: R) => T);
export interface AcceptOptions {
    passive?: boolean;
    immediate?: boolean;
}
export interface Acceptor extends AcceptOptions {
    keys?: string[];
    callback?: (config: any) => void | boolean;
}
export const enum ScopeStatus {
    PENDING = 0,
    LOADING = 1,
    ACTIVE = 2,
    FAILED = 3,
    DISPOSED = 4
}
export class CordisError extends Error {
    code: CordisError.Code;
    constructor(code: CordisError.Code, message?: string);
}
export namespace CordisError {
    type Code = keyof typeof Code;
    const Code: {
        readonly INACTIVE_EFFECT: "cannot create effect on inactive context";
    };
}
export abstract class EffectScope<C extends Context = Context> {
    parent: C;
    config: C['config'];
    uid: number | null;
    ctx: C;
    disposables: Disposable[];
    error: any;
    status: ScopeStatus;
    isActive: boolean;
    protected context: Context;
    protected proxy: any;
    protected acceptors: Acceptor[];
    protected tasks: Set<Promise<void>>;
    protected hasError: boolean;
    abstract runtime: MainScope<C>;
    abstract dispose(): boolean;
    abstract update(config: C['config'], forced?: boolean): void;
    constructor(parent: C, config: C['config']);
    protected get _config(): any;
    assertActive(): void;
    effect(callback: Callable<DisposableLike, [ctx: C, config: any]>, config?: any): {
        dispose: Disposable;
    } | (() => void);
    collect(label: string, callback: () => any): () => any;
    restart(): void;
    protected _getStatus(): ScopeStatus;
    updateStatus(callback?: () => void): void;
    ensure(callback: () => Promise<void>): void;
    cancel(reason?: any): void;
    get ready(): boolean;
    reset(): void;
    protected init(error?: any): void;
    start(): true | undefined;
    accept(callback?: (config: C['config']) => void | boolean, options?: AcceptOptions): () => boolean;
    accept(keys: string[], callback?: (config: C['config']) => void | boolean, options?: AcceptOptions): () => boolean;
    decline(keys: string[]): () => boolean;
    checkUpdate(resolved: any, forced?: boolean): boolean[];
}
export class ForkScope<C extends Context = Context> extends EffectScope<C> {
    runtime: MainScope<C>;
    dispose: () => boolean;
    constructor(parent: Context, runtime: MainScope<C>, config: C['config'], error?: any);
    start(): true | undefined;
    update(config: any, forced?: boolean): void;
}
export class MainScope<C extends Context = Context> extends EffectScope<C> {
    plugin: Plugin;
    value: any;
    runtime: this;
    schema: any;
    name?: string;
    inject: Dict<Inject.Meta>;
    forkables: Function[];
    children: ForkScope<C>[];
    isReusable?: boolean;
    isReactive?: boolean;
    constructor(ctx: C, plugin: Plugin, config: any, error?: any);
    get isForkable(): boolean;
    fork(parent: Context, config: any, error?: any): ForkScope<C>;
    dispose(): boolean;
    private setup;
    private apply;
    reset(): void;
    start(): true | undefined;
    update(config: C['config'], forced?: boolean): void;
}
export interface Context {
    get<K extends string & keyof this>(name: K): undefined | this[K];
    get(name: string): any;
    set<K extends string & keyof this>(name: K, value: undefined | this[K]): () => void;
    set(name: string, value: any): () => void;
    /** @deprecated use `ctx.set()` instead */
    provide(name: string, value?: any, builtin?: boolean): void;
    accessor(name: string, options: Omit<Context.Internal.Accessor, 'type'>): void;
    alias(name: string, aliases: string[]): void;
    mixin<K extends string & keyof this>(name: K, mixins: (keyof this & keyof this[K])[] | Dict<string>): void;
    mixin<T extends {}>(source: T, mixins: (keyof this & keyof T)[] | Dict<string>): void;
}
declare class ReflectService {
    ctx: Context;
    static resolveInject(ctx: Context, name: string): readonly [string, Context.Internal.Service | Context.Internal.Accessor];
    static checkInject(ctx: Context, name: string, error: Error): void;
    static handler: ProxyHandler<Context>;
    constructor(ctx: Context);
    get(name: string): any;
    set(name: string, value: any): () => void;
    provide(name: string, value?: any, builtin?: boolean): void;
    _accessor(name: string, options: Omit<Context.Internal.Accessor, 'type'>): () => void;
    accessor(name: string, options: Omit<Context.Internal.Accessor, 'type'>): void;
    alias(name: string, aliases: string[]): void;
    _mixin(source: any, mixins: string[] | Dict<string>): () => void;
    mixin(source: any, mixins: string[] | Dict<string>): void;
    trace<T>(value: T): T;
    bind<T extends Function>(callback: T): T;
}
export function isBailed(value: any): boolean;
export type Parameters<F> = F extends (...args: infer P) => any ? P : never;
export type ReturnType<F> = F extends (...args: any) => infer R ? R : never;
export type ThisType<F> = F extends (this: infer T, ...args: any) => any ? T : never;
export type GetEvents<C extends Context> = C[typeof Context.events];
export interface Context {
    [Context.events]: Events<this>;
    parallel<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): Promise<void>;
    parallel<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): Promise<void>;
    emit<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): void;
    emit<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): void;
    serial<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    serial<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    bail<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    bail<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    on<K extends keyof GetEvents<this>>(name: K, listener: GetEvents<this>[K], options?: boolean | EventOptions): () => boolean;
    once<K extends keyof GetEvents<this>>(name: K, listener: GetEvents<this>[K], options?: boolean | EventOptions): () => boolean;
    off<K extends keyof GetEvents<this>>(name: K, listener: GetEvents<this>[K]): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export interface EventOptions {
    prepend?: boolean;
    global?: boolean;
}
export interface Hook extends EventOptions {
    ctx: Context;
    callback: (...args: any[]) => any;
}
declare class Lifecycle {
    private ctx;
    isActive: boolean;
    _tasks: Set<Promise<void>>;
    _hooks: Record<keyof any, Hook[]>;
    constructor(ctx: Context);
    flush(): Promise<void>;
    filterHooks(hooks: Hook[], thisArg?: object): Hook[];
    dispatch(type: string, args: any[]): Generator<any, void, unknown>;
    parallel(...args: any[]): Promise<void>;
    emit(...args: any[]): void;
    serial(...args: any[]): Promise<any>;
    bail(...args: any[]): any;
    register(label: string, hooks: Hook[], callback: any, options: EventOptions): () => any;
    unregister(hooks: Hook[], callback: any): true | undefined;
    on(name: string, listener: (...args: any) => any, options?: boolean | EventOptions): any;
    once(name: string, listener: (...args: any) => any, options?: boolean | EventOptions): any;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export interface Events<in C extends Context = Context> {
    'fork'(ctx: C, config: C['config']): void;
    'ready'(): Awaitable<void>;
    'dispose'(): Awaitable<void>;
    'internal/fork'(fork: ForkScope<C>): void;
    'internal/runtime'(runtime: MainScope<C>): void;
    'internal/status'(scope: EffectScope<C>, oldValue: ScopeStatus): void;
    'internal/info'(this: C, format: any, ...param: any[]): void;
    'internal/error'(this: C, format: any, ...param: any[]): void;
    'internal/warning'(this: C, format: any, ...param: any[]): void;
    'internal/before-service'(this: C, name: string, value: any): void;
    'internal/service'(this: C, name: string, value: any): void;
    'internal/before-update'(fork: ForkScope<C>, config: any): void;
    'internal/update'(fork: ForkScope<C>, oldConfig: any): void;
    'internal/inject'(this: C, name: string): boolean | undefined;
    'internal/listener'(this: C, name: string, listener: any, prepend: boolean): void;
    'internal/event'(type: 'emit' | 'parallel' | 'serial' | 'bail', name: string, args: any[], thisArg: any): void;
}
export { Lifecycle, ReflectService, Registry };
export namespace Context {
    type Parameterized<C, T = any> = C & {
        config: T;
    };
    /** @deprecated use `string[]` instead */
    interface MixinOptions {
        methods?: string[];
        accessors?: string[];
        prototype?: {};
    }
    interface Item<C extends Context> {
        value?: any;
        source: C;
    }
    type Internal = Internal.Service | Internal.Accessor | Internal.Alias;
    namespace Internal {
        interface Service {
            type: 'service';
            builtin?: boolean;
            prototype?: {};
        }
        interface Accessor {
            type: 'accessor';
            get: (this: Context, receiver: any) => any;
            set?: (this: Context, value: any, receiver: any) => boolean;
        }
        interface Alias {
            type: 'alias';
            name: string;
        }
    }
}
export interface Intercept<C extends Context = Context> {
}
export interface Context {
    [Context.store]: Dict<Context.Item<this>, symbol>;
    [Context.isolate]: Dict<symbol>;
    [Context.intercept]: Intercept<this>;
    [Context.internal]: Dict<Context.Internal>;
    root: this;
    lifecycle: Lifecycle;
    reflect: ReflectService;
    registry: Registry<this>;
    config: any;
}
export class Context {
    static readonly store: unique symbol;
    static readonly events: unique symbol;
    static readonly static: unique symbol;
    static readonly filter: unique symbol;
    static readonly expose: unique symbol;
    static readonly isolate: unique symbol;
    static readonly internal: unique symbol;
    static readonly intercept: unique symbol;
    static readonly origin = "ctx";
    static readonly current = "ctx";
    static is<C extends Context>(value: any): value is C;
    /** @deprecated use `Service.traceable` instead */
    static associate<T extends {}>(object: T, name: string): T;
    constructor(config?: any);
    get name(): string;
    get events(): Lifecycle;
    /** @deprecated */
    get state(): EffectScope<this>;
    extend(meta?: {}): this;
    isolate(name: string, label?: symbol): this;
    intercept<K extends keyof Intercept>(name: K, config: Intercept[K]): this;
}
