import Random from 'inaba';
export function isInteger(source: any): boolean;
export function sleep(ms: number): Promise<void>;
export function enumKeys<T extends string>(data: Record<T, string | number>): T[];
export function defineEnumProperty<T extends object>(object: T, key: keyof T, value: T[keyof T]): void;
export function merge<T extends object>(head: T, base: T): T;
export function assertProperty<O, K extends keyof O & string>(config: O, key: K): O[K];
export function coerce(val: any): string;
export function renameProperty<O extends object, K extends keyof O, T extends string>(config: O, key: K, oldKey: T): void;
type Methods<T> = {
    [K in keyof T]?: T[K] extends (...args: infer A) => infer R ? (this: T, ...args: A) => R : T[K];
};
export function extend<T>(prototype: T, methods: Methods<T>): void;
export type Observed<T, R = any> = T & {
    $diff: Partial<T>;
    $update: () => R;
    $merge: (value: Partial<T>) => Observed<T, R>;
};
type UpdateFunction<T, R> = (diff: Partial<T>) => R;
export function observe<T extends object>(target: T, label?: string | number): Observed<T, void>;
export function observe<T extends object, R>(target: T, update: UpdateFunction<T, R>, label?: string | number): Observed<T, R>;
export function interpolate(template: string, context: object, pattern?: RegExp): any;
export function escapeRegExp(source: string): string;
export { is as isType } from 'cosmokit';
export { Random };
export * from 'cosmokit';
