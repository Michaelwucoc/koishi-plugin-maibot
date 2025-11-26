export type LocaleTree = {
    [key in string]: LocaleTree;
};
export namespace LocaleTree {
    function from(locales: string[]): LocaleTree;
}
export function fallback(tree: LocaleTree, locales: string[]): string[];
