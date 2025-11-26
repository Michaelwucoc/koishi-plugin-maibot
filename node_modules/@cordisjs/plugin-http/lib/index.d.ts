import { Context, Schema, Service } from 'cordis';
import { Awaitable, Dict } from 'cosmokit';
import { ClientOptions } from 'ws';
import { ReadableStream } from 'node:stream/web';
export type { WebSocket } from '@cordisjs/plugin-http/adapter';
declare module 'cordis' {
    interface Context {
        http: HTTP;
    }
    interface Intercept {
        http: HTTP.Intercept;
    }
    interface Events {
        'http/file'(this: HTTP, url: string, options: FileOptions): Awaitable<FileResponse | undefined>;
        'http/config'(this: HTTP, config: HTTP.Config): void;
        'http/fetch-init'(this: HTTP, url: URL, init: RequestInit, config: HTTP.Config): void;
        'http/websocket-init'(this: HTTP, url: URL, init: ClientOptions, config: HTTP.Config): void;
    }
}
declare const kHTTPError: unique symbol;
declare class HTTPError extends Error {
    code?: HTTP.Error.Code | undefined;
    [kHTTPError]: boolean;
    response?: HTTP.Response;
    static is(error: any): error is HTTPError;
    constructor(message?: string, code?: HTTP.Error.Code | undefined);
}
export declare namespace HTTP {
    type Method = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH' | 'purge' | 'PURGE' | 'link' | 'LINK' | 'unlink' | 'UNLINK';
    interface ResponseTypes {
        json: any;
        text: string;
        stream: ReadableStream<Uint8Array>;
        blob: Blob;
        formdata: FormData;
        arraybuffer: ArrayBuffer;
    }
    interface Request1 {
        <K extends keyof ResponseTypes>(url: string, config: HTTP.RequestConfig & {
            responseType: K;
        }): Promise<ResponseTypes[K]>;
        <T = any>(url: string, config: HTTP.RequestConfig & {
            responseType: Decoder<T>;
        }): Promise<T>;
        <T = any>(url: string, config?: HTTP.RequestConfig): Promise<T>;
    }
    interface Request2 {
        <K extends keyof ResponseTypes>(url: string, data: any, config: HTTP.RequestConfig & {
            responseType: K;
        }): Promise<ResponseTypes[K]>;
        <T = any>(url: string, data: any, config: HTTP.RequestConfig & {
            responseType: Decoder<T>;
        }): Promise<T>;
        <T = any>(url: string, data?: any, config?: HTTP.RequestConfig): Promise<T>;
    }
    interface Intercept {
        baseURL?: string;
        /** @deprecated use `baseURL` instead */
        endpoint?: string;
        headers?: Dict;
        timeout?: number;
    }
    interface Config extends Intercept {
    }
    interface RequestConfig extends Config {
        method?: Method;
        params?: Dict;
        data?: any;
        keepAlive?: boolean;
        redirect?: RequestRedirect;
        signal?: AbortSignal;
        responseType?: keyof ResponseTypes | Decoder;
        validateStatus?: (status: number) => boolean;
    }
    interface Response<T = any> {
        url: string;
        data: T;
        status: number;
        statusText: string;
        headers: Headers;
    }
    type Decoder<T = any> = (raw: globalThis.Response) => Awaitable<T>;
    type Error = HTTPError;
    namespace Error {
        type Code = 'ETIMEDOUT';
    }
}
export interface FileOptions {
    timeout?: number | string;
}
export interface FileResponse {
    type: string;
    /** @deprecated use `type` instead */
    mime?: string;
    filename: string;
    data: ArrayBuffer;
}
export interface HTTP {
    <K extends keyof HTTP.ResponseTypes>(url: string, config: HTTP.RequestConfig & {
        responseType: K;
    }): Promise<HTTP.Response<HTTP.ResponseTypes[K]>>;
    <T = any>(url: string | URL, config?: HTTP.RequestConfig): Promise<HTTP.Response<T>>;
    <T = any>(method: HTTP.Method, url: string | URL, config?: HTTP.RequestConfig): Promise<HTTP.Response<T>>;
    config: HTTP.Config;
    get: HTTP.Request1;
    delete: HTTP.Request1;
    patch: HTTP.Request2;
    post: HTTP.Request2;
    put: HTTP.Request2;
}
export declare class HTTP extends Service {
    static Error: typeof HTTPError;
    /** @deprecated use `http.isError()` instead */
    static isAxiosError: typeof HTTPError.is;
    static provide: any;
    static [Service.immediate]: boolean;
    static Config: Schema<HTTP.Config>;
    static Intercept: Schema<HTTP.Config>;
    isError: typeof HTTPError.is;
    private _decoders;
    constructor(config?: HTTP.Config);
    constructor(ctx: Context, config?: HTTP.Config);
    static mergeConfig: (target: HTTP.Config, source?: HTTP.Config) => {
        headers: {
            [x: string]: any;
        };
        baseURL?: string;
        endpoint?: string;
        timeout?: number;
    };
    decoder<K extends keyof HTTP.ResponseTypes>(type: K, decoder: HTTP.Decoder<HTTP.ResponseTypes[K]>): () => boolean;
    extend(config?: HTTP.Config): any;
    resolveConfig(init?: HTTP.RequestConfig): HTTP.RequestConfig;
    resolveURL(url: string | URL, config: HTTP.RequestConfig, isWebSocket?: boolean): URL;
    defaultDecoder(response: Response): Promise<any>;
    [Service.invoke](...args: any[]): Promise<HTTP.Response<any>>;
    head(url: string, config?: HTTP.Config): Promise<Headers>;
    /** @deprecated use `ctx.http()` instead */
    axios<T = any>(config: {
        url: string;
    } & HTTP.RequestConfig): Promise<HTTP.Response<T>>;
    axios<T = any>(url: string, config?: HTTP.RequestConfig): Promise<HTTP.Response<T>>;
    ws(url: string | URL, init?: HTTP.Config): WebSocket;
    file(this: HTTP, url: string, options?: FileOptions): Promise<FileResponse>;
    isLocal(url: string): Promise<boolean>;
}
export default HTTP;
