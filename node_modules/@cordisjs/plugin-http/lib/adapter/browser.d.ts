import { LookupAddress } from 'dns';
import { FileResponse } from '../index.js';
export declare function lookup(address: string): Promise<LookupAddress>;
export declare function loadFile(url: string): Promise<FileResponse | undefined>;
declare const WebSocket: {
    new (url: string | URL, protocols?: string | string[]): WebSocket;
    prototype: WebSocket;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
};
export { WebSocket };
