interface Random {
    id(length?: number, radix?: number): string;
    bool(probability: number): boolean;
    /**
     * random real
     * @param lower lower bound (inclusive)
     * @param upper upper bound (exclusive)
     * @returns a random real in the interval [lower, upper)
     */
    real(upper: number): number;
    real(lower: number, upper: number): number;
    /**
     * random integer
     * @param lower lower bound (inclusive)
     * @param upper upper bound (exclusive)
     * @returns a random integer in the interval [lower, upper)
     */
    int(upper: number): number;
    int(lower: number, upper: number): number;
    splice<T>(source: T[]): T;
    pick<T>(source: readonly T[]): T;
    pick<T>(source: readonly T[], count: number): T[];
    shuffle<T>(source: readonly T[]): T[];
    weightedPick<T extends string>(weights: Readonly<Record<T, number>>): T;
}
declare namespace Random {
    interface Static extends Random {
        chars: string;
        new (get?: () => number): Random;
    }
}
declare class Random {
    private get;
    static chars: string;
    constructor(get?: () => number);
}
declare const _default: Random.Static;
export = _default;
