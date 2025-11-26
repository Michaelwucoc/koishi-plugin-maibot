import { Context, Service, z, Logger } from 'cordis';
import { Message, SendOptions, Event, GuildMember, User, Meta, Response, Login, Methods, Status, Upload, WebSocket } from '@satorijs/protocol';
import h from '@satorijs/element';
import { Awaitable, Dict } from 'cosmokit';
import { HTTP } from '@cordisjs/plugin-http';
import { Key } from 'path-to-regexp';
export abstract class MessageEncoder<C extends Context = Context, B extends Bot<C> = Bot<C>> {
    bot: B;
    channelId: string;
    referrer?: any | undefined;
    options: SendOptions;
    errors: Error[];
    results: Message[];
    session: C[typeof Context.session];
    constructor(bot: B, channelId: string, referrer?: any | undefined, options?: SendOptions);
    prepare(): Promise<void>;
    abstract flush(): Promise<void>;
    abstract visit(element: h): Promise<void>;
    render(elements: h[], flush?: boolean): Promise<void>;
    send(content: h.Fragment): Promise<Message[]>;
}
export { MessageEncoder as Modulator, MessageEncoder as Messenger };
declare module '@satorijs/protocol' {
    interface SendOptions {
        session?: Session;
    }
}
export interface Session {
    type: string;
    /** @deprecated */
    subtype: string;
    /** @deprecated */
    subsubtype: string;
    selfId: string;
    platform: string;
    timestamp: number;
    userId?: string;
    channelId?: string;
    guildId?: string;
    messageId?: string;
    operatorId?: string;
    roleId?: string;
    quote?: Message;
    referrer: any;
}
export class Session<C extends Context = Context> {
    [Service.tracker]: {
        associate: string;
        property: string;
    };
    id: number;
    sn: number;
    bot: Bot<C>;
    app: C['root'];
    event: Event;
    locales: string[];
    constructor(bot: Bot<C>, event: Partial<Event>);
    /** @deprecated */
    get data(): Event;
    get isDirect(): boolean;
    set isDirect(value: boolean);
    get author(): GuildMember & User;
    get uid(): string;
    get gid(): string;
    get cid(): string;
    get fid(): string;
    get sid(): string;
    get elements(): h[] | undefined;
    set elements(value: h[] | undefined);
    get content(): string | undefined;
    set content(value: string | undefined);
    setInternal(type: string, data: any): void;
    transform(elements: h[]): Promise<h[]>;
    toJSON(): Event;
}
export function defineAccessor(prototype: {}, name: string, keys: string[]): void;
export type { Fragment, Render } from '@satorijs/element';
export { h, h as Element, h as segment, HTTP, HTTP as Quester };
export * from 'cordis';
export * from 'cosmokit';
export * as Universal from '@satorijs/protocol';
declare module 'cordis' {
    interface Context {
        [Context.session]: Session<this>;
        satori: Satori<this>;
        bots: Bot<this>[] & Dict<Bot<this>>;
        component(name: string, component: Component<GetSession<this>>, options?: Component.Options): () => void;
    }
    namespace Context {
        const session: unique symbol;
    }
    interface Events<C> {
        'satori/meta'(): void;
        'internal/session'(session: GetSession<C>): void;
        'interaction/command'(session: GetSession<C>): void;
        'interaction/button'(session: GetSession<C>): void;
        'message'(session: GetSession<C>): void;
        'message-created'(session: GetSession<C>): void;
        'message-deleted'(session: GetSession<C>): void;
        'message-updated'(session: GetSession<C>): void;
        'message-pinned'(session: GetSession<C>): void;
        'message-unpinned'(session: GetSession<C>): void;
        'guild-added'(session: GetSession<C>): void;
        'guild-removed'(session: GetSession<C>): void;
        'guild-updated'(session: GetSession<C>): void;
        'guild-member-added'(session: GetSession<C>): void;
        'guild-member-removed'(session: GetSession<C>): void;
        'guild-member-updated'(session: GetSession<C>): void;
        'guild-role-created'(session: GetSession<C>): void;
        'guild-role-deleted'(session: GetSession<C>): void;
        'guild-role-updated'(session: GetSession<C>): void;
        'reaction-added'(session: GetSession<C>): void;
        'reaction-removed'(session: GetSession<C>): void;
        'login-added'(session: GetSession<C>): void;
        'login-removed'(session: GetSession<C>): void;
        'login-updated'(session: GetSession<C>): void;
        'friend-request'(session: GetSession<C>): void;
        'guild-request'(session: GetSession<C>): void;
        'guild-member-request'(session: GetSession<C>): void;
        'before-send'(session: GetSession<C>, options: SendOptions): Awaitable<void | boolean>;
        'send'(session: GetSession<C>): void;
        /** @deprecated use `login-added` instead */
        'bot-added'(client: Bot<C>): void;
        /** @deprecated use `login-removed` instead */
        'bot-removed'(client: Bot<C>): void;
        /** @deprecated use `login-updated` instead */
        'bot-status-updated'(client: Bot<C>): void;
        'bot-connect'(client: Bot<C>): Awaitable<void>;
        'bot-disconnect'(client: Bot<C>): Awaitable<void>;
    }
}
declare module '@cordisjs/plugin-http' {
    namespace HTTP {
        function createConfig(this: typeof HTTP, endpoint?: string | boolean): z<Config>;
    }
}
export type Component<S extends Session = Session> = h.Render<Awaitable<h.Fragment>, S>;
export namespace Component {
    interface Options {
        session?: boolean;
    }
}
export type GetSession<C extends Context> = C[typeof Context.session];
declare class SatoriContext extends Context {
    constructor(config?: any);
}
export { SatoriContext as Context };
declare class DisposableSet<T> {
    private ctx;
    private sn;
    private map1;
    private map2;
    constructor(ctx: Context);
    add(...values: T[]): () => void;
    [Symbol.iterator](): SetIterator<T>;
}
export class Satori<C extends Context = Context> extends Service<unknown, C> {
    static [Service.provide]: string;
    static [Service.immediate]: boolean;
    uid: string;
    proxyUrls: DisposableSet<string>;
    _internalRouter: InternalRouter<C>;
    _tempStore: Dict<Response>;
    _loginSeq: number;
    _sessionSeq: number;
    constructor(ctx: C);
    bots: Bot<C>[] & Dict<Bot<C>>;
    component(name: string, component: Component<C[typeof Context.session]>, options?: Component.Options): () => void;
    defineInternalRoute<P extends string>(path: P, callback: (request: InternalRequest<C, ExtractParams<P>>) => Promise<Response>): () => boolean;
    handleInternalRoute(method: HTTP.Method, url: URL, headers?: Headers, body?: any): Promise<Response>;
    toJSON(meta?: boolean): Meta;
}
export default Satori;
export interface InternalRequest<C extends Context, P = any> {
    bot: Bot<C>;
    method: HTTP.Method;
    params: P;
    query: URLSearchParams;
    headers: Dict<string>;
    body: ArrayBuffer;
}
export interface InternalRoute<C extends Context> {
    regexp: RegExp;
    keys: Key[];
    callback: (request: InternalRequest<C>) => Promise<Response>;
}
type Upper = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
type Lower = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Take<S extends string, D extends string, O extends string = ''> = S extends `${infer C extends D}${infer S}` ? Take<S, D, `${O}${C}`> : [O, S];
type TakeIdent<S extends string> = S extends `"${infer P}"${infer S}` ? [P, S] : Take<S, Upper | Lower | Digit | '_'>;
export type ExtractParams<S extends string, O extends {} = {}, A extends 0[] = []> = S extends `${infer C}${infer S}` ? C extends '\\' ? S extends `${string}${infer S}` ? ExtractParams<S, O, A> : O : C extends ':' | '*' ? TakeIdent<S> extends [infer P extends string, infer S extends string] ? ExtractParams<S, O & (A['length'] extends 0 ? {
    [K in P]: string;
} : {
    [K in P]?: string;
}), A> : never : C extends '{' ? ExtractParams<S, O, [0, ...A]> : C extends '}' ? A extends [0, ...infer A extends 0[]] ? ExtractParams<S, O, A> : ExtractParams<S, O, A> : ExtractParams<S, O, A> : O;
export class InternalRouter<C extends Context> {
    ctx: Context;
    [Service.tracker]: {
        property: string;
    };
    routes: InternalRoute<C>[];
    constructor(ctx: Context);
    define<P extends string>(path: P, callback: (request: InternalRequest<C, ExtractParams<P>>) => Promise<Response>): () => boolean;
    handle(bot: Bot<C>, method: HTTP.Method, path: string, query: URLSearchParams, headers: Headers, body: any): undefined | Promise<Response>;
}
export namespace JsonForm {
    function load(data: any, path: string, form: FormData): any;
    function dump(data: any, path: string, form: FormData): any;
    interface Body {
        body: ArrayBuffer;
        headers: Headers;
    }
    function decode(body: Body): Promise<any>;
    function encode(data: any): Promise<Body>;
}
export interface Bot extends Methods {
    userId: string;
    selfId: string;
    internal: any;
}
export abstract class Bot<C extends Context = Context, T = any> {
    ctx: C;
    config: T;
    adapterName: string;
    static reusable: boolean;
    static MessageEncoder?: new (bot: Bot, channelId: string, referrer?: any, options?: SendOptions) => MessageEncoder;
    [Service.tracker]: {
        associate: string;
        property: string;
    };
    sn: number;
    user?: User;
    platform?: string;
    features: string[];
    hidden: boolean;
    adapter: Adapter<C, this>;
    error: any;
    callbacks: Dict<Function>;
    logger: Logger;
    _internalRouter: InternalRouter<C>;
    protected context: Context;
    protected _status: Status;
    constructor(ctx: C, config: T, adapterName: string);
    getInternalUrl(path: string, init?: ConstructorParameters<typeof URLSearchParams>[0], slash?: boolean): string;
    defineInternalRoute<P extends string>(path: P, callback: (request: InternalRequest<C, ExtractParams<P>>) => Promise<Response>): () => boolean;
    update(login: Login): void;
    dispose(): Promise<void>;
    private dispatchLoginEvent;
    get status(): Status;
    set status(value: Status);
    get isActive(): boolean;
    online(): void;
    offline(error?: Error): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    get sid(): string;
    session(event?: Partial<Event>): C[typeof Context.session];
    dispatch(session: C[typeof Context.session]): void;
    createMessage(channelId: string, content: h.Fragment, referrer?: any, options?: SendOptions): Promise<import("@satorijs/protocol").Message[]>;
    sendMessage(channelId: string, content: h.Fragment, referrer?: any, options?: SendOptions): Promise<string[]>;
    sendPrivateMessage(userId: string, content: h.Fragment, guildId?: string, options?: SendOptions): Promise<string[]>;
    createUpload(...uploads: Upload[]): Promise<string[]>;
    supports(name: string, session?: Partial<C[typeof Context.session]>): Promise<boolean>;
    checkPermission(name: string, session: Partial<C[typeof Context.session]>): Promise<boolean | undefined>;
    toJSON(): Login;
    getLogin(): Promise<Login>;
    /** @deprecated use `bot.getLogin()` instead */
    getSelf(): Promise<User | undefined>;
}
export abstract class Adapter<C extends Context = Context, B extends Bot<C> = Bot<C>> {
    protected ctx: C;
    static schema: false;
    bots: B[];
    constructor(ctx: C);
    connect(bot: B): Promise<void>;
    disconnect(bot: B): Promise<void>;
    fork(ctx: Context, bot: B): void;
}
export namespace Adapter {
    interface WsClientConfig {
        retryLazy: number;
        retryTimes: number;
        retryInterval: number;
    }
    const WsClientConfig: z<WsClientConfig>;
    abstract class WsClientBase<C extends Context, B extends Bot<C>> extends Adapter<C, B> {
        config: WsClientConfig;
        protected socket?: WebSocket;
        protected connectionId: number;
        protected abstract prepare(): Awaitable<WebSocket>;
        protected abstract accept(socket: WebSocket): void;
        protected abstract getActive(): boolean;
        protected abstract setStatus(status: Status, error?: Error): void;
        constructor(ctx: C, config: WsClientConfig);
        start(): Promise<void>;
        stop(): Promise<void>;
    }
    abstract class WsClient<C extends Context, B extends Bot<C, WsClientConfig>> extends WsClientBase<C, B> {
        bot: B;
        static reusable: boolean;
        constructor(ctx: C, bot: B);
        getActive(): boolean;
        setStatus(status: Status, error?: Error): void;
        connect(bot: B): Promise<void>;
        disconnect(bot: B): Promise<void>;
    }
}
