import { Context, Schema } from 'koishi';
export declare const name = "maibot";
export interface Config {
    apiBaseURL: string;
    apiTimeout?: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map