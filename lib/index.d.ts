import { Context, Schema } from 'koishi';
export declare const name = "maibot";
export declare const inject: string[];
export interface MachineInfo {
    clientId: string;
    regionId: number;
    placeId: number;
    placeName: string;
    regionName: string;
}
export interface Config {
    apiBaseURL: string;
    apiTimeout?: number;
    machineInfo: MachineInfo;
    turnstileToken: string;
    maintenanceNotice?: {
        enabled: boolean;
        startHour: number;
        endHour: number;
        message: string;
    };
    alertMessages?: {
        loginMessage: string;
        logoutMessage: string;
    };
    alertCheckInterval?: number;
    alertConcurrency?: number;
    lockRefreshDelay?: number;
    lockRefreshConcurrency?: number;
    confirmTimeout?: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map