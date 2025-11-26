import { LookupAddress } from 'node:dns';
export declare function isLocalAddress({ address, family }: LookupAddress): Promise<boolean>;
