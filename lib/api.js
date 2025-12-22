"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaiBotAPI = void 0;
const axios_1 = __importDefault(require("axios"));
class MaiBotAPI {
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.baseURL || 'http://localhost:5566',
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * 二维码转用户ID
     */
    async qr2userid(qrText) {
        const response = await this.client.post(`/api/qr2userid/${qrText}`);
        return response.data;
    }
    /**
     * 发票（2-6倍）
     */
    async getTicket(maiUid, ticketId, clientId, regionId, placeId, placeName, regionName) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/get_ticket`, null, {
            params: {
                mai_uid: maiUid,
                ticket_id: ticketId,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 清空功能票
     */
    async clearTicket(maiUid, clientId, regionId, placeId, placeName, regionName) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/clear_ticket`, null, {
            params: {
                mai_uid: maiUid,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 用户状态预览
     */
    async preview(maiUid) {
        const response = await this.client.get('/api/preview', {
            params: { mai_uid: maiUid },
        });
        return response.data;
    }
    /**
     * 用户登录（锁号）
     */
    async login(maiUid, regionId, placeId, clientId, token) {
        const response = await this.client.post('/api/login', {
            token,
        }, {
            params: {
                mai_uid: maiUid,
                region_id: regionId,
                place_id: placeId,
                client_id: clientId,
            },
        });
        return response.data;
    }
    /**
     * 用户登出
     */
    async logout(maiUid, regionId, clientId, placeId, token) {
        const response = await this.client.post('/api/logout', {
            token,
        }, {
            params: {
                mai_uid: maiUid,
                region_id: regionId,
                client_id: clientId,
                place_id: placeId,
            },
        });
        return response.data;
    }
    /**
     * 获取1.5倍票
     */
    async get15Ticket(maiUid, clientId, regionId, placeId, placeName, regionName, token) {
        const response = await this.client.post('/api/get_15_ticket', {
            token,
        }, {
            params: {
                mai_uid: maiUid,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 上传水鱼 B50
     */
    async uploadB50(maiUid, fishToken) {
        const response = await this.client.post('/api/upload_b50', null, {
            params: {
                mai_uid: maiUid,
                fish_token: fishToken,
            },
        });
        return response.data;
    }
    /**
     * 查询水鱼 B50 任务状态
     */
    async getB50TaskStatus(maiUid) {
        const response = await this.client.get('/api/get_b50_task_status', {
            params: { mai_uid: maiUid },
        });
        return response.data;
    }
    /**
     * 根据ID查询水鱼 B50 任务
     */
    async getB50TaskById(taskId) {
        const response = await this.client.get('/api/get_b50_task_byid', {
            params: { taskid: taskId },
        });
        return response.data;
    }
    /**
     * 上传落雪 B50
     */
    async uploadLxB50(maiUid, lxnsCode) {
        const response = await this.client.post('/api/upload_lx_b50', null, {
            params: {
                mai_uid: maiUid,
                lxns_code: lxnsCode,
            },
        });
        return response.data;
    }
    /**
     * 查询落雪 B50 任务状态
     */
    async getLxB50TaskStatus(maiUid) {
        const response = await this.client.get('/api/get_lx_b50_task_status', {
            params: { mai_uid: maiUid },
        });
        return response.data;
    }
    /**
     * 根据ID查询落雪 B50 任务
     */
    async getLxB50TaskById(taskId) {
        const response = await this.client.get('/api/get_lx_b50_task_byid', {
            params: { taskid: taskId },
        });
        return response.data;
    }
    /**
     * 发收藏品
     */
    async getItem(maiUid, itemId, itemKind, clientId, regionId, placeId, placeName, regionName) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/get_item`, null, {
            params: {
                mai_uid: maiUid,
                item_id: itemId,
                item_kind: itemKind,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 清收藏品
     */
    async clearItem(maiUid, itemId, itemKind, clientId, regionId, placeId, placeName, regionName) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/clear_item`, null, {
            params: {
                mai_uid: maiUid,
                item_id: itemId,
                item_kind: itemKind,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 舞里程签到 / 发舞里程
     */
    async maimile(maiUid, maiMile, clientId, regionId, placeId, placeName, regionName) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/maimile`, null, {
            params: {
                mai_uid: maiUid,
                mai_mile: maiMile,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
            },
        });
        return response.data;
    }
    /**
     * 查询票券情况
     */
    async getCharge(maiUid, token) {
        try {
            const response = await this.client.post('/api/get_charge', {
                token,
            }, {
                params: { mai_uid: maiUid },
            });
            return response.data;
        }
        catch (error) {
            // 处理 401 错误（Turnstile 校验失败）
            if (error?.response?.status === 401 && error?.response?.data?.UserID === -2) {
                return { UserID: -2, ChargeStatus: false };
            }
            // 其他错误重新抛出
            throw error;
        }
    }
    /**
     * 上传游戏乐曲成绩
     */
    async uploadScore(maiUid, clientId, regionId, placeId, placeName, regionName, musicId, level, achievement, fcStatus, syncStatus, dxScore) {
        const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/upload_score`, null, {
            params: {
                mai_uid: maiUid,
                client_id: clientId,
                region_id: regionId,
                place_id: placeId,
                place_name: placeName,
                region_name: regionName,
                music_id: musicId,
                level: level,
                achievement: achievement,
                fc_status: fcStatus,
                sync_status: syncStatus,
                dx_score: dxScore,
            },
        });
        return response.data;
    }
}
exports.MaiBotAPI = MaiBotAPI;
MaiBotAPI.ADMIN_PREFIX = '/api/t9yf457788igaga3jvvo';
//# sourceMappingURL=api.js.map