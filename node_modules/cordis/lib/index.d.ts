import * as core from '@cordisjs/core';
import { Logger } from '@cordisjs/logger';
import { SchemaService } from '@cordisjs/schema';
export * from '@cordisjs/core';
export { Schema, z } from '@cordisjs/schema';
export { Logger } from '@cordisjs/logger';
export { TimerService } from '@cordisjs/timer';
export interface Events<C extends Context = Context> extends core.Events<C> {
}
export interface Context {
    [Context.events]: Events<this>;
}
export declare class Context extends core.Context {
    baseDir: string;
    constructor(config?: any);
}
export declare abstract class Service<T = unknown, C extends Context = Context> extends core.Service<T, C> {
    /** @deprecated use `this.ctx.logger` instead */
    logger: Logger;
    schema: SchemaService;
    constructor(...args: core.Spread<T>);
    constructor(ctx: C, ...args: core.Spread<T>);
    constructor(ctx: C, name: string, immediate?: boolean);
    [core.Service.setup](): void;
}
export default function (): void;
