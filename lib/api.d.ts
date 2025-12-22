export interface ApiConfig {
    baseURL: string;
    timeout?: number;
}
export declare class MaiBotAPI {
    private client;
    private static readonly ADMIN_PREFIX;
    constructor(config: ApiConfig);
    /**
     * 二维码转用户ID
     */
    qr2userid(qrText: string): Promise<{
        QRStatus: boolean;
        UserID: string;
    }>;
    /**
     * 发票（2-6倍）
     */
    getTicket(maiUid: string, ticketId: number, clientId: string, regionId: number, placeId: number, placeName?: string, regionName?: string): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        TicketStatus: boolean;
    }>;
    /**
     * 清空功能票
     */
    clearTicket(maiUid: string, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        UserAllStatus?: boolean;
        UserLogStatus?: boolean;
    }>;
    /**
     * 用户状态预览
     */
    preview(maiUid: string): Promise<{
        UserID: string;
        BanState: string;
        IsLogin: string;
        LastLoginDate: string;
        LastPlayDate: string;
        Rating: string;
        UserName: string;
        DataVersion?: string;
        RomVersion?: string;
    }>;
    /**
     * 用户登录（锁号）
     */
    login(maiUid: string, regionId: number, placeId: number, clientId: string, token: string): Promise<{
        LoginStatus: boolean;
        LoginId?: number;
        LastLoginDate?: string;
        UserID?: number;
    }>;
    /**
     * 用户登出
     */
    logout(maiUid: string, regionId: string, clientId: string, placeId: string, token: string): Promise<{
        LogoutStatus: boolean;
    }>;
    /**
     * 获取1.5倍票
     */
    get15Ticket(maiUid: string, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string, token: string): Promise<{
        LoginStatus: boolean;
        LogoutStatus: boolean;
        UserAllStatus: boolean;
        UserLogStatus: boolean;
    }>;
    /**
     * 上传水鱼 B50
     */
    uploadB50(maiUid: string, fishToken: string): Promise<{
        UploadStatus: boolean;
        msg: string;
        task_id: string;
    }>;
    /**
     * 查询水鱼 B50 任务状态
     */
    getB50TaskStatus(maiUid: string): Promise<{
        code: number;
        alive_task_id: string;
        alive_task_time: string;
    }>;
    /**
     * 根据ID查询水鱼 B50 任务
     */
    getB50TaskById(taskId: string): Promise<{
        code: number;
        alive_task_id: string;
        alive_task_time: string;
        alive_task_end_time?: string;
        error?: string;
        done: boolean;
    }>;
    /**
     * 上传落雪 B50
     */
    uploadLxB50(maiUid: string, lxnsCode: string): Promise<{
        UploadStatus: boolean;
        msg: string;
        task_id: string;
    }>;
    /**
     * 查询落雪 B50 任务状态
     */
    getLxB50TaskStatus(maiUid: string): Promise<{
        code: number;
        alive_task_id: string;
        alive_task_time: string;
    }>;
    /**
     * 根据ID查询落雪 B50 任务
     */
    getLxB50TaskById(taskId: string): Promise<{
        code: number;
        alive_task_id: string;
        alive_task_time: string;
        alive_task_end_time?: string;
        error?: string;
        done: boolean;
    }>;
    /**
     * 发收藏品
     */
    getItem(maiUid: string, itemId: string, itemKind: string, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        ItemStatus?: boolean;
    }>;
    /**
     * 清收藏品
     */
    clearItem(maiUid: string, itemId: string, itemKind: string, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        ClearStatus?: boolean;
    }>;
    /**
     * 舞里程签到 / 发舞里程
     */
    maimile(maiUid: string, maiMile: number, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        MileStatus?: boolean;
        CurrentMile?: number;
    }>;
    /**
     * 查询票券情况
     */
    getCharge(maiUid: string, token: string): Promise<{
        ChargeStatus: boolean;
        userChargeList?: Array<{
            chargeId: number;
            purchaseDate: string;
            stock: number;
            validDate: string;
        }>;
        userFreeChargeList?: Array<{
            chargeId: number;
            stock: number;
        }>;
        UserID?: number;
    }>;
    /**
     * 上传游戏乐曲成绩
     */
    uploadScore(maiUid: string, clientId: string, regionId: number, placeId: number, placeName: string, regionName: string, musicId: number, level: number, achievement: number, fcStatus: number, syncStatus: number, dxScore: number): Promise<{
        LoginStatus?: boolean;
        LogoutStatus?: boolean;
        UploadStatus?: boolean;
        UserLogStatus?: boolean;
    }>;
}
//# sourceMappingURL=api.d.ts.map