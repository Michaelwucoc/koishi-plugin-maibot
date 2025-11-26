import { Context } from '@cordisjs/core';
import Schema from 'schemastery';
export { default as Schema, default as z } from 'schemastery';
declare module '@cordisjs/core' {
    interface Events {
        'internal/service-schema'(): void;
    }
}
export class SchemaService {
    ctx: Context;
    _data: Schema & {
        list: Schema[];
    };
    constructor(ctx: Context);
    extend(schema: Schema, order?: number): () => void;
    toJSON(): Schema<any, any>;
}
export default SchemaService;
