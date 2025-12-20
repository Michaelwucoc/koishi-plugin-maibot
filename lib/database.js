"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendDatabase = extendDatabase;
function extendDatabase(ctx) {
    ctx.model.extend('maibot_bindings', {
        id: 'unsigned',
        userId: 'string',
        maiUid: 'string',
        qrCode: 'string',
        bindTime: 'timestamp',
        userName: 'string',
        rating: 'string',
        fishToken: 'string', // 水鱼Token
        lxnsCode: 'string', // 落雪代码
        alertEnabled: 'boolean', // 是否启用播报
        lastLoginStatus: 'boolean', // 上一次登录状态
        guildId: 'string', // 群组ID
        channelId: 'string', // 频道ID
    }, {
        primary: 'id',
        autoInc: true,
        // userName、rating、fishToken、lxnsCode、alertEnabled、lastLoginStatus、guildId、channelId 可以为空
        unique: ['userId'], // 每个用户只能绑定一个账号
    });
}
//# sourceMappingURL=database.js.map