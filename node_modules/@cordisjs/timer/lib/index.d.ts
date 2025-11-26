import { Context, Service } from '@cordisjs/core';
declare module '@cordisjs/core' {
    interface Context {
        timer: TimerService;
        setTimeout(callback: () => void, delay: number): () => void;
        setInterval(callback: () => void, delay: number): () => void;
        sleep(delay: number): Promise<void>;
        throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): WithDispose<F>;
        debounce<F extends (...args: any[]) => void>(callback: F, delay: number): WithDispose<F>;
    }
}
type WithDispose<T> = T & {
    dispose: () => void;
};
export class TimerService extends Service {
    constructor(ctx: Context);
    setTimeout(callback: () => void, delay: number): any;
    setInterval(callback: () => void, delay: number): any;
    sleep(delay: number): Promise<void>;
    private createWrapper;
    throttle<F extends (...args: any[]) => void>(callback: F, delay: number, noTrailing?: boolean): WithDispose<F>;
    debounce<F extends (...args: any[]) => void>(callback: F, delay: number): WithDispose<F>;
}
export default TimerService;
