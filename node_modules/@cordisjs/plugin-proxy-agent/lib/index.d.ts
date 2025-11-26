import * as http from 'node:http';
import { Context, z } from 'cordis';
import { Dispatcher } from 'undici';
declare module 'cordis' {
    interface Events {
        'http/dispatcher'(proxyURL: URL, requestURL: URL): Dispatcher | undefined;
        'http/legacy-agent'(proxyURL: URL, requestURL: URL): http.Agent | undefined;
    }
}
declare module '@cordisjs/plugin-http' {
    namespace HTTP {
        interface Intercept extends ProxyAgentConfig {
        }
    }
}
export const name = "proxy-agent";
export const inject: string[];
type ProxyAgentConfig = Config;
export interface Config {
    proxyAgent: string;
}
export const Config: z<Config>;
export function apply(ctx: Context, _config: Config): void;
