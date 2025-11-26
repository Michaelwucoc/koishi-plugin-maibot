import { Awaitable, Dict } from 'cosmokit';
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [key: string]: any;
            message: {
                id?: string;
                forward?: boolean;
                children?: any;
            };
            quote: {
                id?: string;
                name?: string;
                avatar?: string;
                children?: any;
            };
            at: {
                id?: string;
                name?: string;
                avatar?: string;
                role?: string;
                type?: string;
            };
            sharp: {
                id?: string;
                name?: string;
                avatar?: string;
            };
            img: ResourceElement;
            audio: ResourceElement;
            video: ResourceElement;
            file: ResourceElement;
        }
        interface ResourceElement {
            [key: string]: any;
            src?: string;
            title?: string;
            width?: string | number;
            height?: string | number;
            duration?: string | number;
            poster?: string;
        }
    }
}
declare const kElement: unique symbol;
interface Element {
    [kElement]: true;
    type: string;
    attrs: Dict;
    /** @deprecated use `attrs` instead */
    data: Dict;
    children: Element[];
    source?: string;
    toString(strip?: boolean): string;
}
type RenderFunction = Element.Render<Element.Fragment, Awaitable<Element.Fragment>>;
declare function Element(type: string | RenderFunction, ...children: (Element.Fragment | undefined)[]): Element;
declare function Element(type: string | RenderFunction, attrs: Dict, ...children: (Element.Fragment | undefined)[]): Element;
declare namespace Element {
    export const jsx: typeof Element;
    export const jsxs: typeof Element;
    export const jsxDEV: typeof Element;
    export const Fragment = "template";
    export type Fragment = string | Element | (string | Element)[];
    export type Visit<T, S> = (element: Element, session: S) => T;
    export type Render<T, S> = (attrs: Dict, children: Element[], session: S) => T;
    export type SyncTransformer<S = never> = boolean | Fragment | Render<boolean | Fragment, S>;
    export type Transformer<S = never> = boolean | Fragment | Render<Awaitable<boolean | Fragment>, S>;
    type SyncVisitor<S> = Dict<SyncTransformer<S>> | Visit<boolean | Fragment, S>;
    type Visitor<S> = Dict<Transformer<S>> | Visit<Awaitable<boolean | Fragment>, S>;
    export function isElement(source: any): source is Element;
    export function toElement(content: string | Element | undefined): Element | undefined;
    export function toElementArray(content?: Element.Fragment): Element[];
    export function normalize(source: Fragment, context?: any): Element[];
    export function escape(source: string, inline?: boolean): string;
    export function unescape(source: string): string;
    export interface FindOptions {
        type?: string;
        caret?: boolean;
    }
    /** @deprecated use `Element.select()` instead */
    export function from(source: string, options?: FindOptions): Element | undefined;
    type Combinator = ' ' | '>' | '+' | '~';
    export interface Selector {
        type: string;
        combinator: Combinator;
    }
    export function parseSelector(input: string): Selector[][];
    export function select(source: string | Element[], query: string | Selector[][]): Element[];
    export function interpolate(expr: string, context: any): any;
    export function parse(source: string, context?: any): Element[];
    type Rest<T> = [T] extends [never] ? [session?: T] : [session: T];
    export function transform<S = never>(source: string, rules: SyncVisitor<S>, ...rest: Rest<S>): string;
    export function transform<S = never>(source: Element[], rules: SyncVisitor<S>, ...rest: Rest<S>): Element[];
    export function transformAsync<S = never>(source: string, rules: Visitor<S>, ...rest: Rest<S>): Promise<string>;
    export function transformAsync<S = never>(source: Element[], rules: Visitor<S>, ...rest: Rest<S>): Promise<Element[]>;
    export type Factory<R extends any[]> = (...args: [...rest: R, attrs?: Dict]) => Element;
    export let warn: (message: string) => void;
    export const text: Factory<[content: any]>;
    export const at: Factory<[id: any]>;
    export const sharp: Factory<[id: any]>;
    export const quote: Factory<[id: any]>;
    export const image: Factory<[data: string] | [data: ArrayBuffer | Buffer<ArrayBufferLike> | ArrayBufferView<ArrayBufferLike>, type: string]>;
    export const img: Factory<[data: string] | [data: ArrayBuffer | Buffer<ArrayBufferLike> | ArrayBufferView<ArrayBufferLike>, type: string]>;
    export const video: Factory<[data: string] | [data: ArrayBuffer | Buffer<ArrayBufferLike> | ArrayBufferView<ArrayBufferLike>, type: string]>;
    export const audio: Factory<[data: string] | [data: ArrayBuffer | Buffer<ArrayBufferLike> | ArrayBufferView<ArrayBufferLike>, type: string]>;
    export const file: Factory<[data: string] | [data: ArrayBuffer | Buffer<ArrayBufferLike> | ArrayBufferView<ArrayBufferLike>, type: string]>;
    export function i18n(path: string | Dict, children?: any[]): Element;
    export {};
}
export = Element;
