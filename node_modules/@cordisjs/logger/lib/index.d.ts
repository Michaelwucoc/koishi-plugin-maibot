import { Context, Service } from '@cordisjs/core';
import Logger from 'reggol';
export { Logger };
declare module '@cordisjs/core' {
    interface Context {
        logger: LoggerService;
    }
}
declare module 'reggol' {
    namespace Logger {
        interface Meta {
            ctx?: Context;
        }
    }
}
export interface LoggerService extends Pick<Logger, Logger.Type | 'extend'> {
    (name: string): Logger;
}
export class LoggerService extends Service {
    constructor(ctx: Context);
    [Service.invoke](name: string): Logger;
}
export default LoggerService;
