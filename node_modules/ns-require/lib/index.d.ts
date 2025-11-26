declare function ns(options: ns.Options): ns.Scope;
declare namespace ns {
    function unwrapExports(module: any): any;
    interface Options {
        namespace: string;
        prefix: string;
        official?: string;
        dirname?: string;
    }
    class Scope {
        options: Options;
        private prefixes;
        constructor(options: Options);
        private throwError;
        paths(name: string): string[];
        require(name: string): any;
        resolve(name: string): string;
    }
}
export = ns;
