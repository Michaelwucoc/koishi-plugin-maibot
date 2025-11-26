import { FileResponse } from '../index.js';
export { lookup } from 'node:dns/promises';
export declare function loadFile(url: string): Promise<FileResponse | undefined>;
export { WebSocket } from 'ws';
