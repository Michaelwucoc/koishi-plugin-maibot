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
}
declare module 'koishi' {
    interface Tables {
        maibot_bindings: UserBinding;
    }
}
export declare function extendDatabase(ctx: Context): void;
//# sourceMappingURL=database.d.ts.map