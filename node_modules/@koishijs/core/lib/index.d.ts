import * as utils from '@koishijs/utils';
import * as minato from 'minato';
import * as satori from '@satorijs/core';
import * as cordis from 'cordis';
import { Dict, Awaitable, Promisify } from 'cosmokit';
import { Driver, FlatKeys, FlatPick, Update, Eval } from 'minato';
import { Fragment, EventOptions, Hook, h, Schema, Universal, Bot, HTTP } from '@satorijs/core';
import { LocaleTree } from '@koishijs/i18n-utils';
import { Disposable, GetEvents, Parameters, ReturnType, ThisType } from 'cordis';
import { version } from '../package';
export interface Context {
    [minato.Types]: Types;
    [minato.Tables]: Tables;
    [Context.Database]: Context.Database<this>;
    broadcast(content: Fragment, forced?: boolean): Promise<string[]>;
    broadcast(channels: readonly string[], content: Fragment, forced?: boolean): Promise<string[]>;
}
export namespace Context {
    interface Database<C extends Context = Context> {
        getUser<K extends FlatKeys<User>>(platform: string, pid: string, modifier?: Driver.Cursor<K>): Promise<FlatPick<User, K>>;
        setUser(platform: string, pid: string, data: Update<User>): Promise<void>;
        createUser(platform: string, pid: string, data: Partial<User>): Promise<User>;
        getChannel<K extends FlatKeys<Channel>>(platform: string, id: string, modifier?: Driver.Cursor<K>): Promise<FlatPick<Channel, K | 'id' | 'platform'>>;
        getChannel<K extends FlatKeys<Channel>>(platform: string, ids: string[], modifier?: Driver.Cursor<K>): Promise<FlatPick<Channel, K>[]>;
        getAssignedChannels<K extends Channel.Field>(fields?: K[], selfIdMap?: Dict<string[]>): Promise<Pick<Channel, K>[]>;
        setChannel(platform: string, id: string, data: Update<Channel>): Promise<void>;
        createChannel(platform: string, id: string, data: Partial<Channel>): Promise<Channel>;
    }
}
export interface Types extends minato.Types {
}
export interface Tables extends minato.Tables {
    user: User;
    binding: Binding;
    channel: Channel;
}
export interface User {
    id: number;
    name: string;
    /** @deprecated */
    flag: number;
    authority: number;
    locales: string[];
    permissions: string[];
    createdAt: Date;
}
export namespace User {
    enum Flag {
        ignore = 1
    }
    type Field = keyof User;
    type Observed<K extends Field = Field> = utils.Observed<Pick<User, K>, Promise<void>>;
}
export interface Binding {
    aid: number;
    bid: number;
    pid: string;
    platform: string;
}
export interface Channel {
    id: string;
    platform: string;
    /** @deprecated */
    flag: number;
    assignee: string;
    guildId: string;
    locales: string[];
    permissions: string[];
    createdAt: Date;
}
export namespace Channel {
    enum Flag {
        ignore = 1,
        silent = 4
    }
    type Field = keyof Channel;
    type Observed<K extends Field = Field> = utils.Observed<Pick<Channel, K>, Promise<void>>;
}
declare interface KoishiDatabase extends minato.Database<Tables, Types, Context> {
}
declare class KoishiDatabase {
    ctx: Context;
    constructor(ctx: Context);
    getUser<K extends FlatKeys<User>>(platform: string, pid: string, modifier?: Driver.Cursor<K>): Promise<FlatPick<User, K>>;
    setUser(platform: string, pid: string, data: Update<User>): Promise<Driver.WriteResult>;
    createUser(platform: string, pid: string, data: Partial<User>): Promise<User>;
    getChannel<K extends FlatKeys<Channel>>(platform: string, id: string, modifier?: Driver.Cursor<K>): Promise<FlatPick<Channel, K | 'id' | 'platform'>>;
    getChannel<K extends FlatKeys<Channel>>(platform: string, ids: string[], modifier?: Driver.Cursor<K>): Promise<FlatPick<Channel, K>[]>;
    getSelfIds(platforms?: string[]): Dict<string[]>;
    getAssignedChannels<K extends Channel.Field>(fields?: K[], selfIdMap?: Dict<string[]>): Promise<Pick<Channel, K>[]>;
    setChannel(platform: string, id: string, data: Update<Channel>): Promise<Driver.WriteResult>;
    createChannel(platform: string, id: string, data: Partial<Channel>): Promise<Channel>;
    broadcast(...args: [Fragment, boolean?] | [readonly string[], Fragment, boolean?]): Promise<any[]>;
}
export interface Context {
    $processor: Processor;
    middleware<S extends Session = Session>(middleware: Middleware<S>, prepend?: boolean): () => boolean;
    match(pattern: string | RegExp, response: Fragment, options?: Matcher.Options & {
        i18n?: false;
    }): () => boolean;
    match(pattern: string, response: string, options: Matcher.Options & {
        i18n: true;
    }): () => boolean;
}
export interface Events {
    'before-attach-channel'(session: Session, fields: Set<Channel.Field>): void;
    'attach-channel'(session: Session): Awaitable<void | boolean>;
    'before-attach-user'(session: Session, fields: Set<User.Field>): void;
    'attach-user'(session: Session): Awaitable<void | boolean>;
    'before-attach'(session: Session): void;
    'attach'(session: Session): void;
    'middleware'(session: Session): void;
}
export class SessionError extends Error {
    path: string | string[];
    param?: Dict;
    constructor(path: string | string[], param?: Dict);
}
export type Next = (next?: Next.Callback) => Promise<void | Fragment>;
export type Middleware<S extends Session = Session> = (session: S, next: Next) => Awaitable<void | Fragment>;
export namespace Next {
    const MAX_DEPTH = 64;
    type Queue = ((next?: Next) => Awaitable<void | Fragment>)[];
    type Callback = void | string | ((next?: Next) => Awaitable<void | Fragment>);
    function compose(callback: Callback, next?: Next): Promise<void | Fragment>;
}
export interface Matcher extends Matcher.Options {
    context: Context;
    pattern: string | RegExp;
    response: Matcher.Response;
}
export namespace Matcher {
    type Response = Fragment | ((session: Session, params: [string, ...string[]]) => Awaitable<Fragment>);
    interface Options {
        i18n?: boolean;
        appel?: boolean;
        fuzzy?: boolean;
        regex?: boolean;
    }
}
export class Processor {
    private ctx;
    _hooks: Hook[];
    _sessions: Dict<Session>;
    _matchers: Set<Matcher>;
    constructor(ctx: Context);
    middleware(middleware: Middleware, options?: boolean | EventOptions): () => any;
    match(pattern: string | RegExp, response: Matcher.Response, options: Matcher.Options): () => void;
    private _executeMatcher;
    private attach;
    private _handleMessage;
}
export namespace SharedCache {
    interface Entry<T> {
        value: T;
        key: string;
        refs: Set<number>;
    }
}
export class SharedCache<T> {
    #private;
    get(ref: number, key: string): T;
    set(ref: number, key: string, value: T): void;
    delete(ref: number): void;
}
declare const kTemplate: unique symbol;
export interface Context {
    i18n: I18n;
}
export interface Events {
    'internal/i18n'(): void;
}
type GroupNames<P extends string, K extends string = never> = P extends `${string}(${infer R})${infer S}` ? GroupNames<S, K | R> : K;
export type MatchResult<P extends string = never> = Record<GroupNames<P>, string>;
export function createMatch<P extends string>(pattern: P): (string: string) => undefined | MatchResult<P>;
export interface CompareOptions {
    minSimilarity?: number;
}
export namespace I18n {
    type Node = string | Store;
    interface Store {
        [kTemplate]?: string;
        [K: string]: Node;
    }
    type Formatter = (value: any, args: string[], locale: string) => string;
    type Renderer = (dict: Dict, params: any, locale: string) => string;
    interface FindOptions extends CompareOptions {
    }
    interface FindResult<P extends string> {
        locale: string;
        data: MatchResult<P>;
        similarity: number;
    }
}
export class I18n {
    ctx: Context;
    _data: Dict<Dict<string>>;
    _presets: Dict<I18n.Renderer>;
    locales: LocaleTree;
    constructor(ctx: Context, config: I18n.Config);
    fallback(locales: string[]): string[];
    compare(expect: string, actual: string, options?: CompareOptions): number;
    get(key: string, locales?: string[]): Dict<string>;
    private set;
    define(locale: string, dict: I18n.Store): () => void;
    define(locale: string, key: string, value: I18n.Node): () => void;
    find<P extends string>(pattern: P, actual: string, options?: I18n.FindOptions): I18n.FindResult<P>[];
    _render(value: I18n.Node, params: any, locale: string): h[];
    /** @deprecated */
    text(locales: string[], paths: string[], params: object): string;
    render(locales: string[], paths: string[], params: object): h[];
}
export namespace I18n {
    interface Config {
        locales?: string[];
        output?: 'prefer-user' | 'prefer-channel';
        match?: 'strict' | 'prefer-input' | 'prefer-output';
    }
    const Config: Schema<Config>;
}
export interface Context {
    permissions: Permissions;
}
export interface Events {
    'internal/permission'(): void;
}
export namespace Permissions {
    type Links<P extends string> = undefined | string[] | ((data: MatchResult<P>) => undefined | string[]);
    type Check<P extends string> = (data: MatchResult<P>, session: Partial<Session>) => Awaitable<boolean>;
    interface Options<P extends string = string> {
        list?: () => string[];
        check?: Check<P>;
        depends?: Links<P>;
        inherits?: Links<P>;
    }
    interface Entry extends Options {
        match: (string: string) => undefined | MatchResult;
    }
    interface Config {
        authority?: number;
        permissions?: string[];
        dependencies?: string[];
    }
}
export class Permissions {
    ctx: Context;
    store: Permissions.Entry[];
    constructor(ctx: Context);
    define<P extends string>(pattern: P, options: Permissions.Options<P>): () => boolean;
    provide<P extends string>(pattern: P, check: Permissions.Check<P>): () => boolean;
    inherit<P extends string>(pattern: P, inherits: Permissions.Links<P>): () => boolean;
    depend<P extends string>(pattern: P, depends: Permissions.Links<P>): () => boolean;
    list(result?: Set<string>): string[];
    check(name: string, session: Partial<Session>): Promise<boolean>;
    subgraph(type: 'inherits' | 'depends', parents: Iterable<string>, result?: Set<string>): Set<string>;
    test(names: Iterable<string>, session?: Partial<Session>, cache?: Map<string, Promise<boolean>>): Promise<boolean>;
}
export interface Token {
    rest?: string;
    content: string;
    quoted: boolean;
    terminator: string;
    inters: Argv[];
}
export interface Argv<U extends User.Field = never, G extends Channel.Field = never, A extends any[] = any[], O extends {} = {}> {
    args?: A;
    options?: O;
    error?: string;
    source?: string;
    initiator?: string;
    terminator?: string;
    session?: Session<U, G>;
    command?: Command<U, G, A, O>;
    rest?: string;
    pos?: number;
    root?: boolean;
    tokens?: Token[];
    name?: string;
    next?: Next;
}
export namespace Argv {
    export interface Interpolation {
        terminator?: string;
        parse?(source: string): Argv;
    }
    export function interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
    export namespace whitespace {
        const unescape: (source: string) => string;
        const escape: (source: string) => string;
    }
    export class Tokenizer {
        private bracs;
        constructor();
        interpolate(initiator: string, terminator: string, parse?: (source: string) => Argv): void;
        parseToken(source: string, stopReg?: string): Token;
        parse(source: string, terminator?: string): Argv;
        stringify(argv: Argv): string;
    }
    export function parse(source: string, terminator?: string): Argv<never, never, any[], {}>;
    export function stringify(argv: Argv): string;
    export function revert(token: Token): void;
    export interface Domain {
        el: h[];
        elements: h[];
        string: string;
        number: number;
        boolean: boolean;
        text: string;
        rawtext: string;
        user: string;
        channel: string;
        integer: number;
        posint: number;
        natural: number;
        bigint: bigint;
        date: Date;
        img: JSX.IntrinsicElements['img'];
        image: JSX.IntrinsicElements['img'];
        audio: JSX.IntrinsicElements['audio'];
        video: JSX.IntrinsicElements['video'];
        file: JSX.IntrinsicElements['file'];
    }
    export type DomainType = keyof Domain;
    type ParamType<S extends string, F> = S extends `${any}:${infer T}` ? T extends DomainType ? Domain[T] : F : F;
    type Replace<S extends string, X extends string, Y extends string> = S extends `${infer L}${X}${infer R}` ? `${L}${Y}${Replace<R, X, Y>}` : S;
    type ExtractAll<S extends string, F> = S extends `${infer L}]${infer R}` ? [ParamType<L, F>, ...ExtractAll<R, F>] : [];
    type ExtractFirst<S extends string, F> = S extends `${infer L}]${any}` ? ParamType<L, F> : boolean;
    type ExtractSpread<S extends string> = S extends `${infer L}...${infer R}` ? [...ExtractAll<L, string>, ...ExtractFirst<R, string>[]] : [...ExtractAll<S, string>, ...string[]];
    export type ArgumentType<S extends string> = ExtractSpread<Replace<S, '>', ']'>>;
    export type OptionType<S extends string> = ExtractFirst<Replace<S, '>', ']'>, any>;
    export type Type = DomainType | RegExp | readonly string[] | Transform<any> | DomainConfig<any>;
    export interface Declaration {
        name?: string;
        type?: Type;
        fallback?: any;
        variadic?: boolean;
        required?: boolean;
    }
    export type Transform<T> = (source: string, session: Session) => T;
    export interface DomainConfig<T = any> {
        transform?: Transform<T>;
        greedy?: boolean;
        numeric?: boolean;
    }
    export interface OptionConfig<T extends Type = Type> extends Permissions.Config {
        aliases?: string[];
        symbols?: string[];
        value?: any;
        fallback?: any;
        type?: T;
        descPath?: string;
    }
    export interface TypedOptionConfig<T extends Type> extends OptionConfig<T> {
        type: T;
    }
    export interface OptionVariant extends OptionConfig {
        syntax: string;
    }
    export interface OptionDeclaration extends Declaration, OptionVariant {
        values: Dict<any>;
        /** @deprecated */
        valuesSyntax: Dict<string>;
        variants: Dict<OptionVariant>;
    }
    type OptionDeclarationMap = Dict<OptionDeclaration>;
    export namespace CommandBase {
        interface Config {
            strictOptions?: boolean;
        }
    }
    export class CommandBase<T extends CommandBase.Config = CommandBase.Config> {
        readonly name: string;
        ctx: Context;
        config: T;
        declaration: string;
        _arguments: Declaration[];
        _options: OptionDeclarationMap;
        _disposables: Disposable[];
        private _namedOptions;
        private _symbolicOptions;
        constructor(name: string, declaration: string, ctx: Context, config: T);
        _createOption(name: string, def: string, config: OptionConfig): void;
        private _assignOption;
        removeOption<K extends string>(name: K): boolean;
        parse(argv: string | Argv, terminator?: string): Argv;
        private stringifyArg;
        stringify(args: readonly string[], options: any): string;
    }
}
export type Extend<O extends {}, K extends string, T> = {
    [P in K | keyof O]?: (P extends keyof O ? O[P] : unknown) & (P extends K ? T : unknown);
};
export namespace Command {
    interface Alias {
        options?: Dict;
        args?: string[];
        filter?: Computed<boolean>;
    }
    interface Shortcut {
        i18n?: boolean;
        name?: string | RegExp;
        command?: Command;
        prefix?: boolean;
        fuzzy?: boolean;
        args?: string[];
        options?: Dict;
    }
    type Action<U extends User.Field = never, G extends Channel.Field = never, A extends any[] = any[], O extends {} = {}> = (argv: Argv<U, G, A, O>, ...args: A) => Awaitable<void | Fragment>;
    type Usage<U extends User.Field = never, G extends Channel.Field = never> = string | ((session: Session<U, G>) => Awaitable<string>);
}
export class Command<U extends User.Field = never, G extends Channel.Field = never, A extends any[] = any[], O extends {} = {}> extends Argv.CommandBase<Command.Config> {
    children: Command[];
    _parent: Command;
    _aliases: Dict<Command.Alias>;
    _examples: string[];
    _usage?: Command.Usage;
    private _userFields;
    private _channelFields;
    private _actions;
    private _checkers;
    constructor(name: string, decl: string, ctx: Context, config: Command.Config);
    get caller(): Context;
    get displayName(): string;
    set displayName(name: string);
    get parent(): Command;
    set parent(parent: Command);
    static normalize(name: string): string;
    private _registerAlias;
    userFields<T extends User.Field>(fields: FieldCollector<'user', T, A, O>): Command<U | T, G, A, O>;
    channelFields<T extends Channel.Field>(fields: FieldCollector<'channel', T, A, O>): Command<U, G | T, A, O>;
    alias(...names: string[]): this;
    alias(name: string, options: Command.Alias): this;
    _escape(source: any): any;
    /** @deprecated please use `cmd.alias()` instead */
    shortcut(pattern: string | RegExp, config?: Command.Shortcut & {
        i18n?: false;
    }): this;
    /** @deprecated please use `cmd.alias()` instead */
    shortcut(pattern: string, config: Command.Shortcut & {
        i18n: true;
    }): this;
    subcommand<D extends string>(def: D, config?: Command.Config): Command<never, never, Argv.ArgumentType<D>>;
    subcommand<D extends string>(def: D, desc: string, config?: Command.Config): Command<never, never, Argv.ArgumentType<D>>;
    usage(text: Command.Usage<U, G>): this;
    example(example: string): this;
    option<K extends string>(name: K, desc: string, config: Argv.TypedOptionConfig<RegExp>): Command<U, G, A, Extend<O, K, string>>;
    option<K extends string, R>(name: K, desc: string, config: Argv.TypedOptionConfig<(source: string) => R>): Command<U, G, A, Extend<O, K, R>>;
    option<K extends string, R extends string>(name: K, desc: string, config: Argv.TypedOptionConfig<R[]>): Command<U, G, A, Extend<O, K, R>>;
    option<K extends string, D extends string>(name: K, desc: D, config?: Argv.OptionConfig): Command<U, G, A, Extend<O, K, Argv.OptionType<D>>>;
    match(session: Session): boolean;
    check(callback: Command.Action<U, G, A, O>, append?: boolean): this;
    before(callback: Command.Action<U, G, A, O>, append?: boolean): this;
    action(callback: Command.Action<U, G, A, O>, prepend?: boolean): this;
    /** @deprecated */
    use<T extends Command, R extends any[]>(callback: (command: this, ...args: R) => T, ...args: R): T;
    execute(argv: Argv<U, G, A, O>, fallback?: Next): Promise<Fragment>;
    dispose(): void;
    toJSON(): Universal.Command;
}
export namespace Command {
    interface Config extends Argv.CommandBase.Config, Permissions.Config {
        captureQuote?: boolean;
        /** disallow unknown options */
        checkUnknown?: boolean;
        /** check argument count */
        checkArgCount?: boolean;
        /** show command warnings */
        showWarning?: boolean;
        /** handle error */
        handleError?: boolean | ((error: Error, argv: Argv) => Awaitable<void | Fragment>);
        /** enable slash command */
        slash?: boolean;
    }
    const Config: Schema<Config>;
}
export interface Context {
    $commander: Commander;
    command<D extends string>(def: D, config?: Command.Config): Command<never, never, Argv.ArgumentType<D>>;
    command<D extends string>(def: D, desc: string, config?: Command.Config): Command<never, never, Argv.ArgumentType<D>>;
}
export interface Events {
    'before-parse'(content: string, session: Session): Argv;
    'command-added'(command: Command): void;
    'command-updated'(command: Command): void;
    'command-removed'(command: Command): void;
    'command-error'(argv: Argv, error: any): void;
    'command/before-execute'(argv: Argv): Awaitable<void | Fragment>;
    'command/before-attach-channel'(argv: Argv, fields: Set<Channel.Field>): void;
    'command/before-attach-user'(argv: Argv, fields: Set<User.Field>): void;
}
declare interface DeclarationList extends Array<Argv.Declaration> {
    stripped: string;
}
export namespace Commander {
    interface Config {
        prefix?: Computed<string | string[]>;
        prefixMode?: 'auto' | 'strict';
    }
}
export class Commander {
    private ctx;
    private config;
    _commandList: Command[];
    constructor(ctx: Context, config?: Commander.Config);
    private defineElementDomain;
    get(name: string, session?: Session): Command<never, never, any[], {}>;
    updateCommands(bot: Bot): Promise<void>;
    private _resolvePrefixes;
    available(session: Session): string[];
    resolve(key: string, session?: Session): Command<never, never, any[], {}>;
    _resolve(key: string, session?: Session): {
        command?: undefined;
        name?: undefined;
    } | {
        command: Command<never, never, any[], {}>;
        name: string;
    };
    inferCommand(argv: Argv): Command<never, never, any[], {}>;
    resolveCommand(argv: Argv): Command<never, never, any[], {}>;
    command(def: string, ...args: [Command.Config?] | [string, Command.Config?]): Command<never, never, any[], {}>;
    domain<K extends keyof Argv.Domain>(name: K): Argv.DomainConfig<Argv.Domain[K]>;
    domain<K extends keyof Argv.Domain>(name: K, transform: Argv.Transform<Argv.Domain[K]>, options?: Argv.DomainConfig<Argv.Domain[K]>): () => void;
    resolveDomain(type: Argv.Type): any;
    parseValue(source: string, kind: string, argv: Argv, decl?: Argv.Declaration): any;
    parseDecl(source: string): DeclarationList;
}
export interface PromptOptions {
    timeout?: number;
}
export interface SuggestOptions extends CompareOptions {
    actual?: string;
    expect: readonly string[];
    filter?: (name: string) => Awaitable<boolean>;
    prefix?: string;
    suffix: string;
    timeout?: number;
}
export interface Stripped {
    content: string;
    prefix: string;
    appel: boolean;
    hasAt: boolean;
    atSelf: boolean;
}
declare interface Task {
    delay: number;
    content: Fragment;
    resolve(ids: string[]): void;
    reject(reason: any): void;
}
export type FieldCollector<T extends keyof Tables, K = keyof Tables[T], A extends any[] = any[], O extends {} = {}> = Iterable<K> | ((argv: Argv<never, never, A, O>, fields: Set<keyof Tables[T]>) => void);
export interface Session<U extends User.Field = never, G extends Channel.Field = never, C extends Context = Context> extends satori.Session<C> {
    argv?: Argv<U, G>;
    user?: User.Observed<U>;
    channel?: Channel.Observed<G>;
    guild?: Channel.Observed<G>;
    permissions: string[];
    scope?: string;
    response?: () => Promise<Fragment>;
    resolve<T, R extends any[]>(source: T | Eval.Expr | ((session: this, ...args: R) => T), ...args: R): T extends Eval.Expr ? Eval<T> : T extends (...args: any[]) => any ? ReturnType<T> : T;
    stripped: Stripped;
    username: string;
    send(fragment: Fragment, options?: Universal.SendOptions): Promise<string[]>;
    cancelQueued(delay?: number): void;
    sendQueued(content: Fragment, delay?: number): Promise<string[]>;
    getChannel<K extends Channel.Field = never>(id?: string, fields?: K[]): Promise<Channel>;
    observeChannel<T extends Channel.Field = never>(fields: Iterable<T>): Promise<Channel.Observed<T | G>>;
    getUser<K extends User.Field = never>(userId?: string, fields?: K[]): Promise<User>;
    observeUser<T extends User.Field = never>(fields: Iterable<T>): Promise<User.Observed<T | U>>;
    withScope(scope: string, callback: () => Awaitable<h[]>): Promise<h[]>;
    resolveScope(path: string): string;
    text(path: string | string[], params?: object): string;
    i18n(path: string | string[], params?: object): h[];
    collect<T extends 'user' | 'channel'>(key: T, argv: Argv, fields?: Set<keyof Tables[T]>): Set<keyof Tables[T]>;
    execute(content: string | Argv, next?: true | Next): Promise<h[]>;
    middleware(middleware: Middleware<this>): () => boolean;
    prompt(timeout?: number): Promise<string>;
    prompt<T>(callback: (session: this) => Awaitable<T>, options?: PromptOptions): Promise<T>;
    suggest(options: SuggestOptions): Promise<string>;
}
declare interface KoishiSession<U extends User.Field, G extends Channel.Field, C extends Context> extends Session<U, G, C> {
    _stripped: Stripped;
    _queuedTasks: Task[];
    _queuedTimeout: NodeJS.Timeout;
}
declare class KoishiSession<U, G, C> {
    constructor(ctx: C);
    resolve<T, R extends any[]>(source: T | Eval.Expr | ((session: this, ...args: R) => T), ...args: R): T extends Eval.Expr ? Eval<T> : T extends (...args: any[]) => any ? ReturnType<T> : T;
    _stripNickname(content: string): string;
    /** @deprecated */
    get parsed(): Stripped;
    get stripped(): Stripped;
    get username(): string;
    send(fragment: Fragment, options?: Universal.SendOptions): Promise<string[]>;
    cancelQueued(delay?: number): void;
    _next(): void;
    sendQueued(content: Fragment, delay?: number): Promise<string[]>;
    getChannel<K extends Channel.Field = never>(id?: string, fields?: K[]): any;
    _observeChannelLike<K extends Channel.Field = never>(channelId: string, fields?: Iterable<K>): Promise<any>;
    observeChannel<T extends Channel.Field = never>(fields: Iterable<T>): Promise<Channel.Observed<T | G>>;
    getUser<K extends User.Field = never>(userId?: string, fields?: K[]): any;
    observeUser<T extends User.Field = never>(fields: Iterable<T>): Promise<User.Observed<T | U>>;
    withScope(scope: string, callback: () => Awaitable<h[]>): Promise<h[]>;
    resolveScope(path: string): string;
    text(path: string | string[], params?: object): string;
    i18n(path: string | string[], params?: object): h[];
    collect<T extends 'user' | 'channel'>(key: T, argv: Argv, fields?: Set<keyof Tables[T]>): Set<keyof Tables[T]>;
    execute(argv: string | Argv, next?: true | Next): Promise<h[]>;
    middleware(middleware: Middleware<this>): any;
    prompt(timeout?: number): Promise<string>;
    prompt<T>(callback: (session: this) => Awaitable<T>, options?: PromptOptions): Promise<T>;
    suggest(options: SuggestOptions): Promise<string>;
}
export namespace Computed {
    interface Options {
        userFields?: User.Field[];
        channelFields?: Channel.Field[];
    }
}
export type Computed<T> = T | Eval.Expr<T> | ((session: Session) => T);
export type Filter = (session: Session) => boolean;
export interface Context {
    $filter: FilterService;
    filter: Filter;
    any(): this;
    never(): this;
    union(arg: Filter | this): this;
    intersect(arg: Filter | this): this;
    exclude(arg: Filter | this): this;
    user(...values: string[]): this;
    self(...values: string[]): this;
    guild(...values: string[]): this;
    channel(...values: string[]): this;
    platform(...values: string[]): this;
    private(...values: string[]): this;
}
export class FilterService {
    private ctx;
    constructor(ctx: Context);
    any(): Context;
    never(): Context;
    union(arg: Filter | Context): Context;
    intersect(arg: Filter | Context): Context;
    exclude(arg: Filter | Context): Context;
    user(...values: string[]): Context;
    self(...values: string[]): Context;
    guild(...values: string[]): Context;
    channel(...values: string[]): Context;
    platform(...values: string[]): Context;
    private(): Context;
}
declare global {
    interface Schemastery<S, T> {
        computed(options?: Computed.Options): Schema<Computed<S>, Computed<T>>;
    }
    namespace Schemastery {
        interface Static {
            path(options?: Path.Options): Schema<string>;
            filter(): Schema<Computed<boolean>>;
            computed<X>(inner: X, options?: Computed.Options): Schema<Computed<TypeS<X>>, Computed<TypeT<X>>>;
            dynamic(name: string): Schema;
        }
        namespace Path {
            interface Options {
                filters?: Filter[];
                allowCreate?: boolean;
            }
            type Filter = FileFilter | 'file' | 'directory';
            interface FileFilter {
                name: string;
                extensions: string[];
            }
        }
    }
}
declare module '@satorijs/core' {
    interface Context {
        schema: SchemaService;
    }
    interface Events {
        'internal/schema'(name: string): void;
    }
}
export class SchemaService {
    ctx: Context;
    _data: Dict<Schema>;
    constructor(ctx: Context);
    extend(name: string, schema: Schema, order?: number): void;
    get(name: string): Schema;
    set(name: string, schema: Schema): void;
}
export type EffectScope = cordis.EffectScope<Context>;
export type ForkScope = cordis.ForkScope<Context>;
export type MainScope = cordis.MainScope<Context>;
export { Adapter, Bot, Element, h, HTTP, Logger, MessageEncoder, Messenger, Quester, Schema, segment, Universal, z } from '@satorijs/core';
export type { Component, Fragment, Render } from '@satorijs/core';
export { resolveConfig } from 'cordis';
export type { Disposable, ScopeStatus, Plugin } from 'cordis';
declare module 'cordis' {
    namespace Plugin {
        interface Object {
            filter?: boolean;
        }
    }
}
export interface EnvData {
}
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never;
type BeforeEventName = OmitSubstring<keyof Events & string, 'before-'>;
type BeforeEventMap = {
    [E in keyof Events & string as OmitSubstring<E, 'before-'>]: Events[E];
};
export interface Events<C extends Context = Context> extends cordis.Events<C> {
}
export interface Context {
    [Context.events]: Events<this>;
    [Context.session]: Session<never, never, this>;
    koishi: Koishi;
}
export class Context extends satori.Context {
    static shadow: symbol;
    constructor(config?: Context.Config);
    /** @deprecated use `ctx.root` instead */
    get app(): this;
    /** @deprecated use `koishi.config` instead */
    get options(): any;
    /** @deprecated */
    waterfall<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    waterfall<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    /** @deprecated */
    chain<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    chain<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    before<K extends BeforeEventName>(name: K, listener: BeforeEventMap[K], append?: boolean): () => boolean;
}
export namespace Context {
    interface Config extends Config.Basic, Config.Advanced {
        i18n?: I18n.Config;
        delay?: Config.Delay;
        request?: HTTP.Config;
    }
    const Config: Config.Static;
    namespace Config {
        interface Basic extends Commander.Config {
            nickname?: string | string[];
            autoAssign?: Computed<boolean>;
            autoAuthorize?: Computed<number>;
            minSimilarity?: number;
        }
        interface Delay {
            character?: number;
            message?: number;
            cancel?: number;
            broadcast?: number;
            prompt?: number;
        }
        interface Advanced {
            maxListeners?: number;
        }
        interface Static extends Schema<Config> {
            Basic: Schema<Basic>;
            I18n: Schema<I18n>;
            Delay: Schema<Delay>;
            Advanced: Schema<Advanced>;
        }
    }
}
export abstract class Service<T = any, C extends Context = Context> extends satori.Service<T, C> {
    [satori.Service.setup](): void;
}
export { Context as App };
export function defineConfig(config: Context.Config): Context.Config;
declare module '@satorijs/core' {
    interface Bot {
        /** @deprecated */
        getGuildMemberMap(guildId: string): Promise<Dict<string>>;
        broadcast(channels: (string | [string, string] | Session)[], content: Fragment, delay?: number): Promise<string[]>;
    }
}
declare interface KoishiBot extends Bot<Context> {
}
declare class KoishiBot {
    constructor(ctx: Context);
    getGuildMemberMap(guildId: string): Promise<Dict<string>>;
    broadcast(channels: (string | [string, string] | Session)[], content: Fragment, delay?: any): Promise<string[]>;
}
export * from '@koishijs/utils';
export * from 'minato';
export { version };
