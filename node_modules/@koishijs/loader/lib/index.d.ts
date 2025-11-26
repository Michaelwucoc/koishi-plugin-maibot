import { Dict } from '@koishijs/core';
import ns from 'ns-require';
import Loader from './shared';
export * from './shared';
export default class NodeLoader extends Loader {
    scope: ns.Scope;
    localKeys: string[];
    init(filename?: string): Promise<void>;
    migrateEntry(name: string, config: Dict): any;
    migrate(): Promise<void>;
    readConfig(initial?: boolean): Promise<import("@koishijs/core").Context.Config>;
    import(name: string): Promise<any>;
    fullReload(code?: number): void;
}
