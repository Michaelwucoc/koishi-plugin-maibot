import { Context, Service } from 'cordis';
import { MaybeArray } from 'cosmokit';
import { Server as HTTPServer, IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import Schema from 'schemastery';
import KoaRouter from '@koa/router';
import Koa, { Middleware } from 'koa';
export interface ListenOptions {
    host: string;
    port: number;
    maxPort?: number;
}
export function listen({ host, port, maxPort }: ListenOptions): Promise<number>;
export {} from 'koa-body';
declare module 'cordis' {
    interface Context {
        [Context.Server]: Context.Server<this>;
        server: Server & this[typeof Context.Server];
    }
    interface Events {
        'server/ready'(this: Server): void;
    }
    namespace Context {
        const Server: unique symbol;
        interface Server<C extends Context = Context> {
        }
    }
}
type WebSocketCallback = (socket: WebSocket, request: IncomingMessage) => void;
export class WebSocketLayer {
    private server;
    callback?: WebSocketCallback | undefined;
    clients: Set<WebSocket>;
    regexp: RegExp;
    constructor(server: Server, path: MaybeArray<string | RegExp>, callback?: WebSocketCallback | undefined);
    accept(socket: WebSocket, request: IncomingMessage): true | undefined;
    close(): void;
}
export class Server extends KoaRouter {
    protected ctx: Context;
    config: Server.Config;
    [Service.tracker]: {
        associate: string;
        property: string;
    };
    _http: HTTPServer;
    _ws: WebSocketServer;
    wsStack: WebSocketLayer[];
    _koa: Koa<Koa.DefaultState, Koa.DefaultContext>;
    _body: Middleware;
    host: string;
    port: number;
    constructor(ctx: Context, config: Server.Config);
    [Context.filter](ctx: Context): boolean;
    get selfUrl(): string;
    /**
     * hack into router methods to make sure that koa middlewares are disposable
     */
    register(...args: Parameters<KoaRouter['register']>): KoaRouter.Layer;
    ws(path: MaybeArray<string | RegExp>, callback?: WebSocketCallback): WebSocketLayer;
}
export namespace Server {
    interface Config {
        host: string;
        port: number;
        maxPort?: number;
        selfUrl?: string;
    }
    const Config: Schema<Config>;
}
export default Server;
