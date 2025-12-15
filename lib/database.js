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
    }, {
        primary: 'id',
        autoInc: true,
        // userName、rating、fishToken 和 lxnsCode 可以为空
        unique: ['userId'], // 每个用户只能绑定一个账号
    });
}
//# sourceMappingURL=database.js.map