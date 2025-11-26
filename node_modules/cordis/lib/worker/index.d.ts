import Loader from '@cordisjs/loader';
import * as daemon from './daemon.js';
import * as logger from './logger.js';
declare module '@cordisjs/loader' {
    interface Loader {
        internal?: ModuleLoader;
    }
}
export interface Options extends Loader.Config {
    logger?: logger.Config;
    daemon?: daemon.Config;
}
export declare function start(options: Options): Promise<void>;
