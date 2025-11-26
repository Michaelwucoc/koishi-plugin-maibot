import { Dict } from '@koishijs/core';
import * as daemon from './daemon';
import * as logger from './logger';
export * from 'koishi';
declare module '@koishijs/core' {
    namespace Context {
        interface Config {
            plugins?: Dict;
            timezoneOffset?: number;
            stackTraceLimit?: number;
            logger?: logger.Config;
            daemon?: daemon.Config;
        }
    }
}
