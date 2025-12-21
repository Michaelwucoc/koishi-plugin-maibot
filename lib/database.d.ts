import { Context } from 'koishi';
export interface UserBinding {
    id: number;
    userId: string;
    maiUid: string;
    qrCode: string;
    bindTime: Date;
    userName?: string;
    rating?: string;
    fishToken?: string;
    lxnsCode?: string;
    alertEnabled?: boolean;
    lastLoginStatus?: boolean;
    guildId?: string;
    channelId?: string;
    isLocked?: boolean;
    lockTime?: Date;
    lockLoginId?: number;
    protectionMode?: boolean;
}
declare module 'koishi' {
    interface Tables {
        maibot_bindings: UserBinding;
    }
}
export declare function extendDatabase(ctx: Context): void;
//# sourceMappingURL=database.d.ts.map