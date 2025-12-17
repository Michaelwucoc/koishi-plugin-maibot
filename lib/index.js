"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.inject = exports.name = void 0;
exports.apply = apply;
const koishi_1 = require("koishi");
const api_1 = require("./api");
const database_1 = require("./database");
exports.name = 'maibot';
exports.inject = ['database'];
exports.Config = koishi_1.Schema.object({
    apiBaseURL: koishi_1.Schema.string().default('http://localhost:5566').description('API服务地址'),
    apiTimeout: koishi_1.Schema.number().default(30000).description('API请求超时时间（毫秒）'),
    machineInfo: koishi_1.Schema.object({
        clientId: koishi_1.Schema.string().required().description('客户端ID'),
        regionId: koishi_1.Schema.number().required().description('区域ID'),
        placeId: koishi_1.Schema.number().required().description('场所ID'),
        placeName: koishi_1.Schema.string().required().description('场所名称'),
        regionName: koishi_1.Schema.string().required().description('区域名称'),
    }).required().description('机台信息（必填）'),
    turnstileToken: koishi_1.Schema.string().required().description('Turnstile Token（必填）'),
    maintenanceNotice: koishi_1.Schema.object({
        enabled: koishi_1.Schema.boolean().default(true).description('是否启用维护时间提示与拦截'),
        startHour: koishi_1.Schema.number().default(4).description('维护开始时间（小时，0-23）'),
        endHour: koishi_1.Schema.number().default(7).description('维护结束时间（小时，0-23）'),
        message: koishi_1.Schema.string().default('当前为凌立服务器维护时间，本指令暂不可用，请稍后再试。').description('维护时间内的提示文本'),
    }).description('B50 等指令的维护时间配置（例如凌晨 4:00-7:00 不允许上传）').default({
        enabled: true,
        startHour: 4,
        endHour: 7,
        message: '当前为凌立服务器维护时间，本指令暂不可用，请稍后再试。',
    }),
});
/**
 * 隐藏用户ID，只显示部分信息（防止盗号）
 */
function maskUserId(uid) {
    if (!uid || uid.length <= 8) {
        return '***';
    }
    // 显示前4位和后4位，中间用***代替
    const start = uid.substring(0, 4);
    const end = uid.substring(uid.length - 4);
    return `${start}***${end}`;
}
function buildMention(session) {
    if (session.userId) {
        return `<at id="${session.userId}"/>`;
    }
    return `@${session.author?.nickname || session.username || '玩家'}`;
}
async function promptYes(session, message, timeout = 10000) {
    await session.send(`${message}\n在${timeout / 1000}秒内输入 Y 确认，其它输入取消`);
    try {
        const answer = await session.prompt(timeout);
        return answer?.trim().toUpperCase() === 'Y';
    }
    catch {
        return false;
    }
}
const COLLECTION_TYPE_OPTIONS = [
    { label: '头像框', value: 1 },
    { label: '称号', value: 2 },
    { label: '头像', value: 3 },
    { label: '乌蒙地插一个', value: 4 },
    { label: '乐曲', value: 5 },
    { label: '解锁Master', value: 6 },
    { label: '解锁Re:Master', value: 7 },
    { label: '解锁黑铺 (未实装)', value: 8 },
    { label: '旅行伙伴', value: 9 },
    { label: '搭档', value: 10 },
    { label: '背景板', value: 11 },
    { label: '功能票', value: 12 },
];
async function promptCollectionType(session, timeout = 60000) {
    const optionsText = COLLECTION_TYPE_OPTIONS.map((opt, idx) => `${idx + 1}. ${opt.label} (${opt.value})`).join('\n');
    await session.send(`请问你需要什么类型收藏品？\n\n${optionsText}\n\n请输入对应的数字（1-${COLLECTION_TYPE_OPTIONS.length}），或输入0取消`);
    try {
        const answer = await session.prompt(timeout);
        const choice = parseInt(answer?.trim() || '0', 10);
        if (choice === 0) {
            return null;
        }
        if (choice >= 1 && choice <= COLLECTION_TYPE_OPTIONS.length) {
            return COLLECTION_TYPE_OPTIONS[choice - 1].value;
        }
        return null;
    }
    catch {
        return null;
    }
}
function isInMaintenanceWindow(maintenance) {
    if (!maintenance || !maintenance.enabled)
        return false;
    const now = new Date();
    const hour = now.getHours();
    const start = maintenance.startHour;
    const end = maintenance.endHour;
    if (start === end) {
        // 相等视为全天维护
        return true;
    }
    if (start < end) {
        // 普通区间，例如 4-7 点
        return hour >= start && hour < end;
    }
    // 跨零点区间，例如 23-5 点
    return hour >= start || hour < end;
}
function getMaintenanceMessage(maintenance) {
    if (!isInMaintenanceWindow(maintenance))
        return null;
    return maintenance?.message || null;
}
function apply(ctx, config) {
    // 扩展数据库
    (0, database_1.extendDatabase)(ctx);
    // 初始化API客户端
    const api = new api_1.MaiBotAPI({
        baseURL: config.apiBaseURL,
        timeout: config.apiTimeout,
    });
    const logger = ctx.logger('maibot');
    // 使用配置中的值
    const machineInfo = config.machineInfo;
    const turnstileToken = config.turnstileToken;
    const maintenanceNotice = config.maintenanceNotice;
    const scheduleB50Notification = (session, taskId) => {
        const bot = session.bot;
        const channelId = session.channelId;
        if (!bot || !channelId) {
            logger.warn('无法追踪B50任务完成状态：bot或channel信息缺失');
            return;
        }
        const mention = buildMention(session);
        const guildId = session.guildId;
        const maxAttempts = 20;
        const interval = 1000; // 减少到5秒轮询一次，更快响应
        const initialDelay = 2000; // 首次延迟3秒后开始检查
        let attempts = 0;
        const poll = async () => {
            attempts += 1;
            try {
                const detail = await api.getB50TaskById(taskId);
                if (!detail.done && attempts < maxAttempts) {
                    ctx.setTimeout(poll, interval);
                    return;
                }
                if (detail.done) {
                    const statusText = detail.error
                        ? `❌ 任务失败：${detail.error}`
                        : '✅ 任务已完成';
                    const finishTime = detail.alive_task_end_time
                        ? `\n完成时间: ${new Date(parseInt(detail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}`
                        : '';
                    await bot.sendMessage(channelId, `${mention} 水鱼B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`, guildId);
                    return;
                }
                let msg = `${mention} 水鱼B50任务 ${taskId} 上传失败，请稍后再试一次。`;
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                await bot.sendMessage(channelId, msg, guildId);
            }
            catch (error) {
                logger.warn('轮询B50任务状态失败', error);
                if (attempts < maxAttempts) {
                    ctx.setTimeout(poll, interval);
                    return;
                }
                let msg = `${mention} 水鱼B50任务 ${taskId} 上传失败，请稍后再试一次。`;
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                await bot.sendMessage(channelId, msg, guildId);
            }
        };
        // 首次延迟3秒后开始检查，之后每5秒轮询一次
        ctx.setTimeout(poll, initialDelay);
    };
    const scheduleLxB50Notification = (session, taskId) => {
        const bot = session.bot;
        const channelId = session.channelId;
        if (!bot || !channelId) {
            logger.warn('无法追踪落雪B50任务完成状态：bot或channel信息缺失');
            return;
        }
        const mention = buildMention(session);
        const guildId = session.guildId;
        const maxAttempts = 20;
        const interval = 1000; // 1秒轮询一次，更快响应
        const initialDelay = 2000; // 首次延迟2秒后开始检查
        let attempts = 0;
        const poll = async () => {
            attempts += 1;
            try {
                const detail = await api.getLxB50TaskById(taskId);
                if (!detail.done && attempts < maxAttempts) {
                    ctx.setTimeout(poll, interval);
                    return;
                }
                if (detail.done) {
                    const statusText = detail.error
                        ? `❌ 任务失败：${detail.error}`
                        : '✅ 任务已完成';
                    const finishTime = detail.alive_task_end_time
                        ? `\n完成时间: ${new Date(parseInt(detail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}`
                        : '';
                    await bot.sendMessage(channelId, `${mention} 落雪B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`, guildId);
                    return;
                }
                let msg = `${mention} 落雪B50任务 ${taskId} 上传失败，请稍后再试一次。`;
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                await bot.sendMessage(channelId, msg, guildId);
            }
            catch (error) {
                logger.warn('轮询落雪B50任务状态失败', error);
                if (attempts < maxAttempts) {
                    ctx.setTimeout(poll, interval);
                    return;
                }
                let msg = `${mention} 落雪B50任务 ${taskId} 上传失败，请稍后再试一次。`;
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                await bot.sendMessage(channelId, msg, guildId);
            }
        };
        // 首次延迟2秒后开始检查，之后每1秒轮询一次
        ctx.setTimeout(poll, initialDelay);
    };
    /**
     * 绑定用户
     * 用法: /mai绑定 <SGWCMAID...>
     */
    ctx.command('mai绑定 <qrCode:text>', '绑定舞萌DX账号')
        .action(async ({ session }, qrCode) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        if (!qrCode) {
            return '请提供二维码文本（SGWCMAID开头）\n用法：/mai绑定 SGWCMAIDxxxxxxxxxxxxx';
        }
        // 验证二维码格式
        if (!qrCode.startsWith('SGWCMAID')) {
            return '❌ 二维码格式错误，必须以 SGWCMAID 开头';
        }
        if (qrCode.length < 48 || qrCode.length > 128) {
            return '❌ 二维码长度错误，应在48-128字符之间';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定
            const existing = await ctx.database.get('maibot_bindings', { userId });
            if (existing.length > 0) {
                return `❌ 您已经绑定了账号\n用户ID: ${maskUserId(existing[0].maiUid)}\n绑定时间: ${new Date(existing[0].bindTime).toLocaleString('zh-CN')}\n\n如需重新绑定，请先使用 /mai解绑`;
            }
            // 调用API获取用户ID
            const result = await api.qr2userid(qrCode);
            if (!result.QRStatus) {
                return `❌ 绑定失败：无法从二维码获取用户ID\n错误信息: ${result.UserID === 'MTI1MTEy' ? '无效或过期的二维码' : result.UserID}`;
            }
            const maiUid = result.UserID;
            // 获取用户详细信息（可选）
            let userName;
            let rating;
            try {
                const preview = await api.preview(maiUid);
                userName = preview.UserName;
                rating = preview.Rating;
            }
            catch (error) {
                // 如果获取预览失败，不影响绑定
                ctx.logger('maibot').warn('获取用户预览信息失败:', error);
            }
            // 存储到数据库
            await ctx.database.create('maibot_bindings', {
                userId,
                maiUid,
                qrCode,
                bindTime: new Date(),
                userName,
                rating,
            });
            return `✅ 绑定成功！\n` +
                `用户ID: ${maskUserId(maiUid)}\n` +
                (userName ? `用户名: ${userName}\n` : '') +
                (rating ? `Rating: ${rating}\n` : '') +
                `绑定时间: ${new Date().toLocaleString('zh-CN')}`;
        }
        catch (error) {
            ctx.logger('maibot').error('绑定失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 绑定失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 解绑用户
     * 用法: /mai解绑
     */
    ctx.command('mai解绑', '解绑舞萌DX账号')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 查找绑定记录
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 您还没有绑定账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            // 删除绑定记录
            await ctx.database.remove('maibot_bindings', { userId });
            return `✅ 解绑成功！\n已解绑的用户ID: ${maskUserId(bindings[0].maiUid)}`;
        }
        catch (error) {
            ctx.logger('maibot').error('解绑失败:', error);
            return `❌ 解绑失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 查询绑定状态
     * 用法: /mai状态
     */
    ctx.command('mai状态', '查询绑定状态')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 您还没有绑定账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            let statusInfo = `✅ 已绑定账号\n\n` +
                `用户ID: ${maskUserId(binding.maiUid)}\n` +
                `绑定时间: ${new Date(binding.bindTime).toLocaleString('zh-CN')}\n`;
            // 尝试获取最新状态并更新数据库
            try {
                const preview = await api.preview(binding.maiUid);
                // 更新数据库中的用户名和Rating
                await ctx.database.set('maibot_bindings', { userId }, {
                    userName: preview.UserName,
                    rating: preview.Rating,
                });
                statusInfo += `\n📊 账号信息：\n` +
                    `用户名: ${preview.UserName}\n` +
                    `Rating: ${preview.Rating}\n` +
                    `登录状态: ${preview.IsLogin}\n` +
                    `封禁状态: ${preview.BanState}\n`;
            }
            catch (error) {
                // 如果获取失败，使用缓存的信息
                if (binding.userName) {
                    statusInfo += `\n📊 账号信息（缓存）：\n` +
                        `用户名: ${binding.userName}\n` +
                        (binding.rating ? `Rating: ${binding.rating}\n` : '');
                }
                statusInfo += `\n⚠️ 无法获取最新状态，请检查API服务`;
            }
            // 显示水鱼Token绑定状态
            if (binding.fishToken) {
                statusInfo += `\n\n🐟 水鱼Token: 已绑定`;
            }
            else {
                statusInfo += `\n\n🐟 水鱼Token: 未绑定\n使用 /mai绑定水鱼 <token> 进行绑定`;
            }
            // 显示落雪代码绑定状态
            if (binding.lxnsCode) {
                statusInfo += `\n\n❄️ 落雪代码: 已绑定`;
            }
            else {
                statusInfo += `\n\n❄️ 落雪代码: 未绑定\n使用 /mai绑定落雪 <lxns_code> 进行绑定`;
            }
            return statusInfo;
        }
        catch (error) {
            ctx.logger('maibot').error('查询状态失败:', error);
            return `❌ 查询失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 逃离小黑屋（登出）
     * 用法: /mai逃离小黑屋 <turnstileToken>
     */
    ctx.command('mai逃离小黑屋', '登出MaiDX以逃离小黑屋')
        .alias('mai逃离')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            const result = await api.logout(binding.maiUid, machineInfo.regionId.toString(), machineInfo.clientId, machineInfo.placeId.toString(), turnstileToken);
            if (!result.LogoutStatus) {
                return '❌ 登出失败，服务端未返回成功状态，请稍后重试';
            }
            return `✅ 已尝试为您登出账号，建议稍等片刻再登录\n用户ID: ${maskUserId(binding.maiUid)}`;
        }
        catch (error) {
            logger.error('逃离小黑屋失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 登出失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 绑定水鱼Token
     * 用法: /mai绑定水鱼 <fishToken>
     */
    ctx.command('mai绑定水鱼 <fishToken:text>', '绑定水鱼Token用于B50上传')
        .action(async ({ session }, fishToken) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        if (!fishToken) {
            return '请提供水鱼Token\n用法：/mai绑定水鱼 <token>\n\nToken长度应在127-132字符之间';
        }
        // 验证Token长度
        if (fishToken.length < 127 || fishToken.length > 132) {
            return '❌ Token长度错误，应在127-132字符之间';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            // 更新水鱼Token
            await ctx.database.set('maibot_bindings', { userId }, {
                fishToken,
            });
            return `✅ 水鱼Token绑定成功！\nToken: ${fishToken.substring(0, 8)}***${fishToken.substring(fishToken.length - 4)}`;
        }
        catch (error) {
            ctx.logger('maibot').error('绑定水鱼Token失败:', error);
            return `❌ 绑定失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 解绑水鱼Token
     * 用法: /mai解绑水鱼
     */
    ctx.command('mai解绑水鱼', '解绑水鱼Token（保留舞萌DX账号绑定）')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 检查是否已绑定水鱼Token
            if (!binding.fishToken) {
                return '❌ 您还没有绑定水鱼Token\n使用 /mai绑定水鱼 <token> 进行绑定';
            }
            // 清除水鱼Token（设置为空字符串）
            await ctx.database.set('maibot_bindings', { userId }, {
                fishToken: '',
            });
            return `✅ 水鱼Token解绑成功！\n已解绑的Token: ${binding.fishToken.substring(0, 8)}***${binding.fishToken.substring(binding.fishToken.length - 4)}\n\n舞萌DX账号绑定仍保留`;
        }
        catch (error) {
            ctx.logger('maibot').error('解绑水鱼Token失败:', error);
            return `❌ 解绑失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 绑定落雪代码
     * 用法: /mai绑定落雪 <lxnsCode>
     */
    ctx.command('mai绑定落雪 <lxnsCode:text>', '绑定落雪代码用于B50上传')
        .action(async ({ session }, lxnsCode) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        if (!lxnsCode) {
            return '请提供落雪代码\n用法：/mai绑定落雪 <lxns_code>\n\n落雪代码长度必须为15';
        }
        // 验证代码长度
        if (lxnsCode.length !== 15) {
            return '❌ 落雪代码长度错误，必须为15个字符';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            // 更新落雪代码
            await ctx.database.set('maibot_bindings', { userId }, {
                lxnsCode,
            });
            return `✅ 落雪代码绑定成功！\n代码: ${lxnsCode.substring(0, 5)}***${lxnsCode.substring(lxnsCode.length - 3)}`;
        }
        catch (error) {
            ctx.logger('maibot').error('绑定落雪代码失败:', error);
            return `❌ 绑定失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 解绑落雪代码
     * 用法: /mai解绑落雪
     */
    ctx.command('mai解绑落雪', '解绑落雪代码（保留舞萌DX账号绑定）')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 检查是否已绑定落雪代码
            if (!binding.lxnsCode) {
                return '❌ 您还没有绑定落雪代码\n使用 /mai绑定落雪 <lxns_code> 进行绑定';
            }
            // 清除落雪代码（设置为空字符串）
            await ctx.database.set('maibot_bindings', { userId }, {
                lxnsCode: '',
            });
            return `✅ 落雪代码解绑成功！\n已解绑的代码: ${binding.lxnsCode.substring(0, 5)}***${binding.lxnsCode.substring(binding.lxnsCode.length - 3)}\n\n舞萌DX账号绑定仍保留`;
        }
        catch (error) {
            ctx.logger('maibot').error('解绑落雪代码失败:', error);
            return `❌ 解绑失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 发票（2-6倍票）
     * 用法: /mai发票 [倍数]，默认2
     */
    ctx.command('mai发票 [multiple:number]', '为账号发放功能票（2-6倍）')
        .action(async ({ session }, multipleInput) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const multiple = multipleInput ? Number(multipleInput) : 2;
        if (!Number.isInteger(multiple) || multiple < 2 || multiple > 6) {
            return '❌ 倍数必须是2-6之间的整数\n例如：/mai发票 3';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            const baseTip = `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放 ${multiple} 倍票`;
            const confirmFirst = await promptYes(session, `${baseTip}\n操作具有风险，请谨慎`);
            if (!confirmFirst) {
                return '操作已取消（第一次确认未通过）';
            }
            const confirmSecond = await promptYes(session, '二次确认：若理解风险，请再次输入 Y 执行');
            if (!confirmSecond) {
                return '操作已取消（第二次确认未通过）';
            }
            if (multiple >= 3) {
                const confirmThird = await promptYes(session, '第三次确认：3倍及以上票券风险更高，确定继续？');
                if (!confirmThird) {
                    return '操作已取消（第三次确认未通过）';
                }
            }
            await session.send('⏳ 已开始请求发票，服务器响应可能需要约10秒，请耐心等待...');
            const ticketResult = await api.getTicket(binding.maiUid, multiple, machineInfo.clientId, machineInfo.regionId, machineInfo.placeId, machineInfo.placeName, machineInfo.regionName);
            if (ticketResult.LoginStatus === false ||
                ticketResult.LogoutStatus === false ||
                ticketResult.TicketStatus === false) {
                return '❌ 发票失败：服务器返回未成功，请确认是否已在短时间内多次执行发票指令或稍后再试';
            }
            return `✅ 已为 ${maskUserId(binding.maiUid)} 发放 ${multiple} 倍票\n请稍等几分钟在游戏内确认`;
        }
        catch (error) {
            logger.error('发票失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 发票失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 舞里程发放 / 签到
     * 用法: /mai舞里程 <里程数>
     */
    ctx.command('mai舞里程 <mile:number>', '为账号发放舞里程（maimile）')
        .action(async ({ session }, mileInput) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const mile = Number(mileInput);
        if (!Number.isInteger(mile) || mile <= 0) {
            return '❌ 舞里程必须是大于 0 的整数';
        }
        // 安全逻辑：必须是 1000 的倍数，且小于 99999
        if (mile % 1000 !== 0) {
            return '❌ 舞里程必须是 1000 的倍数，例如：1000 / 2000 / 5000';
        }
        if (mile >= 99999) {
            return '❌ 舞里程过大，请控制在 99999 以下';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            const baseTip = `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放 ${mile} 点舞里程`;
            const confirmFirst = await promptYes(session, `${baseTip}\n操作具有风险，请谨慎`);
            if (!confirmFirst) {
                return '操作已取消（第一次确认未通过）';
            }
            const confirmSecond = await promptYes(session, '二次确认：若理解风险，请再次输入 Y 执行');
            if (!confirmSecond) {
                return '操作已取消（第二次确认未通过）';
            }
            await session.send('⏳ 已开始请求发放舞里程，服务器响应可能需要数秒，请耐心等待...');
            const result = await api.maimile(binding.maiUid, mile, machineInfo.clientId, machineInfo.regionId, machineInfo.placeId, machineInfo.placeName, machineInfo.regionName);
            if (result.MileStatus === false ||
                result.LoginStatus === false ||
                result.LogoutStatus === false) {
                return '❌ 发放舞里程失败：服务器返回未成功，请稍后再试';
            }
            const current = typeof result.CurrentMile === 'number'
                ? `\n当前舞里程：${result.CurrentMile}`
                : '';
            return `✅ 已为 ${maskUserId(binding.maiUid)} 发放 ${mile} 点舞里程${current}`;
        }
        catch (error) {
            logger.error('发舞里程失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 发放舞里程失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 上传B50到水鱼
     * 用法: /mai上传B50
     */
    ctx.command('mai上传B50', '上传B50数据到水鱼')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 检查是否已绑定水鱼Token
            if (!binding.fishToken) {
                return '❌ 请先绑定水鱼Token\n使用 /mai绑定水鱼 <token> 进行绑定';
            }
            // 维护时间内直接提示，不发起上传请求
            const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
            if (maintenanceMsg) {
                return maintenanceMsg;
            }
            // 上传B50
            const result = await api.uploadB50(binding.maiUid, binding.fishToken);
            if (!result.UploadStatus) {
                if (result.msg === '该账号下存在未完成的任务') {
                    return '⚠️ 当前账号已有未完成的水鱼B50任务，请稍后使用 /mai查询B50 查看任务状态，无需重复上传。';
                }
                return `❌ 上传失败：${result.msg || '未知错误'}`;
            }
            scheduleB50Notification(session, result.task_id);
            return `✅ B50上传任务已提交！\n任务ID: ${result.task_id}\n\n使用 /mai查询B50 查看任务状态`;
        }
        catch (error) {
            ctx.logger('maibot').error('上传B50失败:', error);
            // 处理请求超时类错误，统一提示
            if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
                let msg = '水鱼B50任务 上传失败，请稍后再试一次。';
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                return msg;
            }
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 上传失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 清空功能票
     * 用法: /mai清票
     */
    ctx.command('mai清票', '清空账号的所有功能票')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            const confirm = await promptYes(session, `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的所有功能票，确认继续？`);
            if (!confirm) {
                return '操作已取消';
            }
            const result = await api.clearTicket(binding.maiUid, machineInfo.clientId, machineInfo.regionId, machineInfo.placeId, machineInfo.placeName, machineInfo.regionName);
            if (result.ClearStatus === false || result.TicketStatus === false) {
                return '❌ 清票失败：服务器未返回成功状态，请稍后再试';
            }
            return `✅ 已清空 ${maskUserId(binding.maiUid)} 的所有功能票`;
        }
        catch (error) {
            logger.error('清票失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 清票失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 查询B50任务状态
     * 用法: /mai查询B50
     */
    ctx.command('mai查询B50', '查询B50上传任务状态')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 查询任务状态
            const taskStatus = await api.getB50TaskStatus(binding.maiUid);
            if (taskStatus.code !== 0 || !taskStatus.alive_task_id) {
                return 'ℹ️ 当前没有正在进行的B50上传任务';
            }
            // 查询任务详情
            const taskDetail = await api.getB50TaskById(taskStatus.alive_task_id);
            let statusInfo = `📊 B50上传任务状态\n\n` +
                `任务ID: ${taskStatus.alive_task_id}\n` +
                `开始时间: ${new Date(parseInt(taskStatus.alive_task_time) * 1000).toLocaleString('zh-CN')}\n`;
            if (taskDetail.done) {
                statusInfo += `状态: ✅ 已完成\n`;
                if (taskDetail.alive_task_end_time) {
                    statusInfo += `完成时间: ${new Date(parseInt(taskDetail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}\n`;
                }
                if (taskDetail.error) {
                    statusInfo += `错误信息: ${taskDetail.error}\n`;
                }
            }
            else {
                statusInfo += `状态: ⏳ 进行中\n`;
                if (taskDetail.error) {
                    statusInfo += `错误信息: ${taskDetail.error}\n`;
                }
            }
            return statusInfo;
        }
        catch (error) {
            ctx.logger('maibot').error('查询B50任务状态失败:', error);
            return `❌ 查询失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 发收藏品
     * 用法: /mai发收藏品
     */
    ctx.command('mai发收藏品', '发放收藏品')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 交互式选择收藏品类别
            const itemKind = await promptCollectionType(session);
            if (itemKind === null) {
                return '操作已取消';
            }
            const selectedType = COLLECTION_TYPE_OPTIONS.find(opt => opt.value === itemKind);
            await session.send(`已选择：${selectedType?.label} (${itemKind})\n\n` +
                `请输入收藏品ID（数字）\n` +
                `如果不知道收藏品ID，请前往 https://sdgb.lemonno.xyz/ 查询\n` +
                `乐曲解禁请输入乐曲ID\n\n` +
                `输入0取消操作`);
            const itemIdInput = await session.prompt(60000);
            if (!itemIdInput || itemIdInput.trim() === '0') {
                return '操作已取消';
            }
            const itemId = itemIdInput.trim();
            // 验证ID是否为数字
            if (!/^\d+$/.test(itemId)) {
                return '❌ ID必须是数字，请重新输入';
            }
            const confirm = await promptYes(session, `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放收藏品\n类型: ${selectedType?.label} (${itemKind})\nID: ${itemId}\n确认继续？`);
            if (!confirm) {
                return '操作已取消';
            }
            await session.send('⏳ 正在发放收藏品，请稍候...');
            const result = await api.getItem(binding.maiUid, itemId, itemKind.toString(), machineInfo.clientId, machineInfo.regionId, machineInfo.placeId, machineInfo.placeName, machineInfo.regionName);
            if (result.ItemStatus === false || result.LoginStatus === false || result.LogoutStatus === false) {
                return '❌ 发放失败：服务器未返回成功状态，请稍后再试';
            }
            return `✅ 已为 ${maskUserId(binding.maiUid)} 发放收藏品\n类型: ${selectedType?.label}\nID: ${itemId}`;
        }
        catch (error) {
            logger.error('发收藏品失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 发放失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 清收藏品
     * 用法: /mai清收藏品
     */
    ctx.command('mai清收藏品', '清空收藏品')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 交互式选择收藏品类别
            const itemKind = await promptCollectionType(session);
            if (itemKind === null) {
                return '操作已取消';
            }
            const selectedType = COLLECTION_TYPE_OPTIONS.find(opt => opt.value === itemKind);
            await session.send(`已选择：${selectedType?.label} (${itemKind})\n\n` +
                `请输入收藏品ID（数字）\n` +
                `如果不知道收藏品ID，请前往 https://sdgb.lemonno.xyz/ 查询\n` +
                `乐曲解禁请输入乐曲ID\n\n` +
                `输入0取消操作`);
            const itemIdInput = await session.prompt(60000);
            if (!itemIdInput || itemIdInput.trim() === '0') {
                return '操作已取消';
            }
            const itemId = itemIdInput.trim();
            // 验证ID是否为数字
            if (!/^\d+$/.test(itemId)) {
                return '❌ ID必须是数字，请重新输入';
            }
            const confirm = await promptYes(session, `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的收藏品\n类型: ${selectedType?.label} (${itemKind})\nID: ${itemId}\n确认继续？`);
            if (!confirm) {
                return '操作已取消';
            }
            await session.send('⏳ 正在清空收藏品，请稍候...');
            const result = await api.clearItem(binding.maiUid, itemId, itemKind.toString(), machineInfo.clientId, machineInfo.regionId, machineInfo.placeId, machineInfo.placeName, machineInfo.regionName);
            if (result.ClearStatus === false || result.LoginStatus === false || result.LogoutStatus === false) {
                return '❌ 清空失败：服务器未返回成功状态，请稍后再试';
            }
            return `✅ 已清空 ${maskUserId(binding.maiUid)} 的收藏品\n类型: ${selectedType?.label}\nID: ${itemId}`;
        }
        catch (error) {
            logger.error('清收藏品失败:', error);
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 清空失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 上传落雪B50
     * 用法: /mai上传落雪b50 [lxns_code]
     */
    ctx.command('mai上传落雪b50 [lxnsCode:text]', '上传B50数据到落雪')
        .action(async ({ session }, lxnsCode) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 确定使用的落雪代码
            let finalLxnsCode;
            if (lxnsCode) {
                // 如果提供了参数，使用参数
                // 验证落雪代码长度
                if (lxnsCode.length !== 15) {
                    return '❌ 落雪代码长度错误，必须为15个字符';
                }
                finalLxnsCode = lxnsCode;
            }
            else {
                // 如果没有提供参数，使用绑定的代码
                if (!binding.lxnsCode) {
                    return '❌ 请先绑定落雪代码或提供落雪代码参数\n使用 /mai绑定落雪 <lxns_code> 进行绑定\n或使用 /mai上传落雪b50 <lxns_code> 直接提供代码';
                }
                finalLxnsCode = binding.lxnsCode;
            }
            // 维护时间内直接提示，不发起上传请求
            const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
            if (maintenanceMsg) {
                return maintenanceMsg;
            }
            // 上传落雪B50
            const result = await api.uploadLxB50(binding.maiUid, finalLxnsCode);
            if (!result.UploadStatus) {
                if (result.msg === '该账号下存在未完成的任务') {
                    return '⚠️ 当前账号已有未完成的落雪B50任务，请稍后使用 /mai查询落雪B50 查看任务状态，无需重复上传。';
                }
                return `❌ 上传失败：${result.msg || '未知错误'}`;
            }
            scheduleLxB50Notification(session, result.task_id);
            return `✅ 落雪B50上传任务已提交！\n任务ID: ${result.task_id}\n\n使用 /mai查询落雪B50 查看任务状态`;
        }
        catch (error) {
            ctx.logger('maibot').error('上传落雪B50失败:', error);
            // 处理请求超时类错误，统一提示
            if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
                let msg = '落雪B50任务 上传失败，请稍后再试一次。';
                const maintenanceMsg = getMaintenanceMessage(maintenanceNotice);
                if (maintenanceMsg) {
                    msg += `\n${maintenanceMsg}`;
                }
                return msg;
            }
            if (error?.response) {
                return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`;
            }
            return `❌ 上传失败: ${error?.message || '未知错误'}`;
        }
    });
    /**
     * 查询落雪B50任务状态
     * 用法: /mai查询落雪B50
     */
    ctx.command('mai查询落雪B50', '查询落雪B50上传任务状态')
        .action(async ({ session }) => {
        if (!session) {
            return '❌ 无法获取会话信息';
        }
        const userId = session.userId;
        try {
            // 检查是否已绑定账号
            const bindings = await ctx.database.get('maibot_bindings', { userId });
            if (bindings.length === 0) {
                return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定';
            }
            const binding = bindings[0];
            // 查询任务状态
            const taskStatus = await api.getLxB50TaskStatus(binding.maiUid);
            if (taskStatus.code !== 0 || !taskStatus.alive_task_id) {
                return 'ℹ️ 当前没有正在进行的落雪B50上传任务';
            }
            // 查询任务详情
            const taskDetail = await api.getLxB50TaskById(taskStatus.alive_task_id);
            let statusInfo = `📊 落雪B50上传任务状态\n\n` +
                `任务ID: ${taskStatus.alive_task_id}\n` +
                `开始时间: ${new Date(parseInt(taskStatus.alive_task_time) * 1000).toLocaleString('zh-CN')}\n`;
            if (taskDetail.done) {
                statusInfo += `状态: ✅ 已完成\n`;
                if (taskDetail.alive_task_end_time) {
                    statusInfo += `完成时间: ${new Date(parseInt(taskDetail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}\n`;
                }
                if (taskDetail.error) {
                    statusInfo += `错误信息: ${taskDetail.error}\n`;
                }
            }
            else {
                statusInfo += `状态: ⏳ 进行中\n`;
                if (taskDetail.error) {
                    statusInfo += `错误信息: ${taskDetail.error}\n`;
                }
            }
            return statusInfo;
        }
        catch (error) {
            ctx.logger('maibot').error('查询落雪B50任务状态失败:', error);
            return `❌ 查询失败: ${error?.message || '未知错误'}`;
        }
    });
}
//# sourceMappingURL=index.js.map