import { Context, Schema, Session } from 'koishi'
import { MaiBotAPI } from './api'
import { extendDatabase, UserBinding } from './database'

export const name = 'maibot'
export const inject = ['database']

export interface MachineInfo {
  clientId: string
  regionId: number
  placeId: number
  placeName: string
  regionName: string
}

export interface Config {
  apiBaseURL: string
  apiTimeout?: number
  machineInfo: MachineInfo
  turnstileToken: string
  maintenanceNotice?: {
    enabled: boolean
    startHour: number
    endHour: number
    message: string
  }
  alertMessages?: {
    loginMessage: string  // 上线消息
    logoutMessage: string  // 下线消息
  }
  alertCheckInterval?: number  // 检查间隔（毫秒）
  alertConcurrency?: number  // 并发检查数量
  lockRefreshDelay?: number  // 锁定账号刷新时每次 login 的延迟（毫秒）
  lockRefreshConcurrency?: number  // 锁定账号刷新时的并发数
  confirmTimeout?: number  // 确认提示超时时间（毫秒）
  rebindTimeout?: number  // 重新绑定超时时间（毫秒），默认60秒
  protectionCheckInterval?: number  // 保护模式检查间隔（毫秒）
  authLevelForProxy?: number  // 代操作功能需要的auth等级（默认3）
  protectionLockMessage?: string  // 保护模式锁定成功消息（支持占位符：{playerid} 玩家名，{at} @用户）
  maintenanceMode?: boolean  // 维护模式开关
  maintenanceMessage?: string  // 维护模式提示消息
  hideLockAndProtection?: boolean  // 隐藏锁定模式和保护模式功能
  whitelist?: {
    enabled: boolean  // 白名单开关
    guildIds: string[]  // 允许使用的群ID列表
    message: string  // 非白名单群的提示消息
  }
  autoRecall?: boolean  // 自动撤回用户发送的SGID消息
}

export const Config: Schema<Config> = Schema.object({
  apiBaseURL: Schema.string().default('http://localhost:5566').description('API服务地址'),
  apiTimeout: Schema.number().default(30000).description('API请求超时时间（毫秒）'),
  machineInfo: Schema.object({
    clientId: Schema.string().required().description('客户端ID'),
    regionId: Schema.number().required().description('区域ID'),
    placeId: Schema.number().required().description('场所ID'),
    placeName: Schema.string().required().description('场所名称'),
    regionName: Schema.string().required().description('区域名称'),
  }).required().description('机台信息（必填）'),
  turnstileToken: Schema.string().required().description('Turnstile Token（必填）'),
  maintenanceNotice: Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用维护时间提示与拦截'),
    startHour: Schema.number().default(4).description('维护开始时间（小时，0-23）'),
    endHour: Schema.number().default(7).description('维护结束时间（小时，0-23）'),
    message: Schema.string().default('❌503 当前为服务器维护时间，本指令暂不可用，请稍后再试。').description('维护时间内的提示文本'),
  }).description('B50 等指令的维护时间配置（例如凌晨 4:00-7:00 不允许上传）').default({
    enabled: true,
    startHour: 4,
    endHour: 7,
    message: '当前为凌立服务器维护时间，本指令暂不可用，请稍后再试。',
  }),
  alertMessages: Schema.object({
    loginMessage: Schema.string().default('{playerid}{at} 你的账号已上线。').description('账号上线时的提示消息（支持占位符：{playerid} 玩家名，{at} @用户）'),
    logoutMessage: Schema.string().default('{playerid}{at} 你的账号已下线。').description('账号下线时的提示消息（支持占位符：{playerid} 玩家名，{at} @用户）'),
  }).description('账号状态提醒消息配置').default({
    loginMessage: '{playerid}{at} 你的账号已上线。',
    logoutMessage: '{playerid}{at} 你的账号已下线。',
  }),
  alertCheckInterval: Schema.number().default(60000).description('账号状态检查间隔（毫秒），默认60秒（60000毫秒）'),
  alertConcurrency: Schema.number().default(3).description('并发检查数量，默认3个用户同时检查'),
  lockRefreshDelay: Schema.number().default(1000).description('锁定账号刷新时每次 login 的延迟（毫秒），默认1秒（1000毫秒）'),
  lockRefreshConcurrency: Schema.number().default(3).description('锁定账号刷新时的并发数，默认3个账号同时刷新'),
  confirmTimeout: Schema.number().default(10000).description('确认提示超时时间（毫秒），默认10秒（10000毫秒）'),
  rebindTimeout: Schema.number().default(60000).description('重新绑定超时时间（毫秒），默认60秒（60000毫秒）'),
  protectionCheckInterval: Schema.number().default(60000).description('保护模式检查间隔（毫秒），默认60秒（60000毫秒）'),
  authLevelForProxy: Schema.number().default(3).description('代操作功能需要的auth等级，默认3'),
  protectionLockMessage: Schema.string().default('🛡️ 保护模式：{playerid}{at} 你的账号已自动锁定成功').description('保护模式锁定成功消息（支持占位符：{playerid} 玩家名，{at} @用户）'),
  maintenanceMode: Schema.boolean().default(false).description('维护模式开关，开启时所有指令都会提示维护信息'),
  maintenanceMessage: Schema.string().default('⚠️  Milk Server Studio 正在进行维护。具体清查阅 https://awmc.cc/').description('维护模式提示消息'),
  hideLockAndProtection: Schema.boolean().default(false).description('隐藏锁定模式和保护模式功能，开启后相关指令将不可用，状态信息也不会显示'),
  whitelist: Schema.object({
    enabled: Schema.boolean().default(false).description('白名单开关，开启后只有白名单内的群可以使用Bot功能'),
    guildIds: Schema.array(Schema.string()).default(['1072033605']).description('允许使用Bot功能的群ID列表'),
    message: Schema.string().default('本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。').description('非白名单群的提示消息'),
  }).description('群白名单配置').default({
    enabled: false,
    guildIds: ['1072033605'],
    message: '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。',
  }),
  autoRecall: Schema.boolean().default(true).description('自动撤回用户发送的SGID消息（尝试撤回，如不支持则忽略）'),
})

// 我认识了很多朋友 以下是我认识的好朋友们！
// Fracture_Hikaritsu
// MisakaNo
// Tome Chen

/**
 * 票券ID到中文名称的映射
 */
const TICKET_NAME_MAP: Record<number, string> = {
  6: '6倍票',
  5: '5倍票',
  4: '4倍票',
  3: '3倍票',
  2: '2倍票',
  10005: '活动5倍票_1',
  10105: '活动5倍票_2',
  10205: '活动5倍票_3',
  30001: '联动票',
  0: '不使用',
  11001: '免费1.5倍票',
  30002: '每周区域前进2倍票',
  30003: '旅行伙伴等级提升5倍票',
}

/**
 * 获取票券中文名称
 */
function getTicketName(chargeId: number): string {
  return TICKET_NAME_MAP[chargeId] || `未知票券(${chargeId})`
}

/**
 * 隐藏用户ID，只显示部分信息（防止盗号）
 */
function maskUserId(uid: string): string {
  if (!uid || uid.length <= 8) {
    return '***'
  }
  // 显示前4位和后4位，中间用***代替
  const start = uid.substring(0, 4)
  const end = uid.substring(uid.length - 4)
  return `${start}***${end}`
}

function buildMention(session: Session): string {
  if (session.userId) {
    return `<at id="${session.userId}"/>`
  }
  return `@${session.author?.nickname || session.username || '玩家'}`
}

// promptYes 函数将在 apply 函数内部重新定义以使用配置
async function promptYes(session: Session, message: string, timeout?: number): Promise<boolean> {
  const actualTimeout = timeout ?? 10000
  await session.send(`${message}\n在${actualTimeout / 1000}秒内输入 Y 确认，其它输入取消`)
  try {
    const answer = await session.prompt(actualTimeout)
    return answer?.trim().toUpperCase() === 'Y'
  } catch {
    return false
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
]

async function promptCollectionType(session: Session, timeout = 60000): Promise<number | null> {
  const optionsText = COLLECTION_TYPE_OPTIONS.map(
    (opt, idx) => `${idx + 1}. ${opt.label} (${opt.value})`
  ).join('\n')
  
  await session.send(
    `请问你需要什么类型收藏品？\n\n${optionsText}\n\n请输入对应的数字（1-${COLLECTION_TYPE_OPTIONS.length}），或输入0取消`
  )
  
  try {
    const answer = await session.prompt(timeout)
    const choice = parseInt(answer?.trim() || '0', 10)
    
    if (choice === 0) {
      return null
    }
    
    if (choice >= 1 && choice <= COLLECTION_TYPE_OPTIONS.length) {
      return COLLECTION_TYPE_OPTIONS[choice - 1].value
    }
    
    return null
  } catch {
    return null
  }
}

const LEVEL_OPTIONS = [
  { label: 'Basic', value: 1 },
  { label: 'Advanced', value: 2 },
  { label: 'Expert', value: 3 },
  { label: 'Master', value: 4 },
  { label: 'Re:Master', value: 5 },
]

const FC_STATUS_OPTIONS = [
  { label: '无', value: 0 },
  { label: 'Full Combo', value: 1 },
  { label: 'Full Combo+', value: 2 },
  { label: 'All Perfect', value: 3 },
  { label: 'All Perfect+', value: 4 },
]

const SYNC_STATUS_OPTIONS = [
  { label: '无', value: 0 },
  { label: 'Full Sync', value: 1 },
  { label: 'Full Sync DX', value: 2 },
]

interface ScoreData {
  musicId: number
  level: number
  achievement: number
  fcStatus: number
  syncStatus: number
  dxScore: number
}

async function promptScoreData(session: Session, timeout = 60000): Promise<ScoreData | null> {
  try {
    // 1. 乐曲ID
    await session.send(
      '请输入乐曲ID（数字）\n' +
      '如果不知道乐曲ID，请前往 https://maimai.lxns.net/songs 查询\n\n' +
      '输入0取消操作'
    )
    const musicIdInput = await session.prompt(timeout)
    if (!musicIdInput || musicIdInput.trim() === '0') {
      return null
    }
    const musicId = parseInt(musicIdInput.trim(), 10)
    if (isNaN(musicId) || musicId <= 0) {
      await session.send('❌ 乐曲ID必须是大于0的数字，操作已取消')
      return null
    }

    // 2. 难度等级
    const levelOptionsText = LEVEL_OPTIONS.map(
      (opt, idx) => `${idx + 1}. ${opt.label} (${opt.value})`
    ).join('\n')
    await session.send(
      `请选择难度等级：\n\n${levelOptionsText}\n\n请输入对应的数字（1-${LEVEL_OPTIONS.length}），或输入0取消`
    )
    const levelInput = await session.prompt(timeout)
    const levelChoice = parseInt(levelInput?.trim() || '0', 10)
    if (levelChoice === 0) {
      return null
    }
    if (levelChoice < 1 || levelChoice > LEVEL_OPTIONS.length) {
      await session.send('❌ 无效的选择，操作已取消')
      return null
    }
    const level = LEVEL_OPTIONS[levelChoice - 1].value

    // 3. 达成率（achievement）
    await session.send(
      '请输入达成率（整数，例如：1010000 表示 S+）\n' +
      '参考：\n' +
      '  S+ = 1010000\n' +
      '  S = 1007500\n' +
      '  A+ = 1005000\n' +
      '  A = 1000000\n\n' +
      '输入0取消操作'
    )
    const achievementInput = await session.prompt(timeout)
    if (!achievementInput || achievementInput.trim() === '0') {
      return null
    }
    const achievement = parseInt(achievementInput.trim(), 10)
    if (isNaN(achievement) || achievement < 0) {
      await session.send('❌ 达成率必须是大于等于0的数字，操作已取消')
      return null
    }

    // 4. Full Combo状态
    const fcOptionsText = FC_STATUS_OPTIONS.map(
      (opt, idx) => `${idx + 1}. ${opt.label} (${opt.value})`
    ).join('\n')
    await session.send(
      `请选择Full Combo状态：\n\n${fcOptionsText}\n\n请输入对应的数字（1-${FC_STATUS_OPTIONS.length}），或输入0取消`
    )
    const fcInput = await session.prompt(timeout)
    const fcChoice = parseInt(fcInput?.trim() || '0', 10)
    if (fcChoice === 0) {
      return null
    }
    if (fcChoice < 1 || fcChoice > FC_STATUS_OPTIONS.length) {
      await session.send('❌ 无效的选择，操作已取消')
      return null
    }
    const fcStatus = FC_STATUS_OPTIONS[fcChoice - 1].value

    // 5. 同步状态
    const syncOptionsText = SYNC_STATUS_OPTIONS.map(
      (opt, idx) => `${idx + 1}. ${opt.label} (${opt.value})`
    ).join('\n')
    await session.send(
      `请选择同步状态：\n\n${syncOptionsText}\n\n请输入对应的数字（1-${SYNC_STATUS_OPTIONS.length}），或输入0取消`
    )
    const syncInput = await session.prompt(timeout)
    const syncChoice = parseInt(syncInput?.trim() || '0', 10)
    if (syncChoice === 0) {
      return null
    }
    if (syncChoice < 1 || syncChoice > SYNC_STATUS_OPTIONS.length) {
      await session.send('❌ 无效的选择，操作已取消')
      return null
    }
    const syncStatus = SYNC_STATUS_OPTIONS[syncChoice - 1].value

    // 6. DX分数
    await session.send(
      '请输入DX分数（整数）\n\n' +
      '输入0取消操作'
    )
    const dxScoreInput = await session.prompt(timeout)
    if (!dxScoreInput || dxScoreInput.trim() === '0') {
      return null
    }
    const dxScore = parseInt(dxScoreInput.trim(), 10)
    if (isNaN(dxScore) || dxScore < 0) {
      await session.send('❌ DX分数必须是大于等于0的数字，操作已取消')
      return null
    }

    return {
      musicId,
      level,
      achievement,
      fcStatus,
      syncStatus,
      dxScore,
    }
  } catch {
    return null
  }
}

function isInMaintenanceWindow(maintenance?: {
  enabled: boolean
  startHour: number
  endHour: number
}): boolean {
  if (!maintenance || !maintenance.enabled) return false
  const now = new Date()
  const hour = now.getHours()
  const start = maintenance.startHour
  const end = maintenance.endHour

  if (start === end) {
    // 相等视为全天维护
    return true
  }

  if (start < end) {
    // 普通区间，例如 4-7 点
    return hour >= start && hour < end
  }

  // 跨零点区间，例如 23-5 点
  return hour >= start || hour < end
}

function getMaintenanceMessage(maintenance?: {
  enabled: boolean
  startHour: number
  endHour: number
  message: string
}): string | null {
  if (!isInMaintenanceWindow(maintenance)) return null
  return maintenance?.message || null
}

/**
 * 将 IsLogin 字符串转换为布尔值
 * 支持多种格式：'true', 'True', 'TRUE', true, 1, '1' 等
 */
function parseLoginStatus(isLogin: string | boolean | number | undefined): boolean {
  if (isLogin === undefined || isLogin === null) {
    return false
  }
  
  if (typeof isLogin === 'boolean') {
    return isLogin
  }
  
  if (typeof isLogin === 'number') {
    return isLogin !== 0
  }
  
  if (typeof isLogin === 'string') {
    const lower = isLogin.toLowerCase().trim()
    return lower === 'true' || lower === '1' || lower === 'yes'
  }
  
  return false
}

/**
 * 检查API返回的状态是否全部为false
 * 当所有状态都为false时，表示二维码已失效，需要重新绑定
 */
function checkAllStatusFalse(result: {
  LoginStatus?: boolean
  LogoutStatus?: boolean
  UserAllStatus?: boolean
  UserLogStatus?: boolean
  [key: string]: any
}): boolean {
  return (
    result.LoginStatus === false &&
    result.LogoutStatus === false &&
    result.UserAllStatus === false &&
    result.UserLogStatus === false
  )
}

/**
 * 从session中提取二维码文本
 * 支持从文本消息或图片消息中提取
 */
async function extractQRCodeFromSession(
  session: Session,
  ctx: Context
): Promise<string | null> {
  // 1. 检查文本消息中是否包含SGID
  const text = session.content?.trim() || ''
  if (text && text.startsWith('SGWCMAID')) {
    return text
  }

  // 2. 检查是否有图片消息
  if (session.elements) {
    for (const element of session.elements) {
      if (element.type === 'image' || element.type === 'img') {
        // 尝试获取图片URL或本地路径
        const imageUrl = element.attrs?.url || element.attrs?.src || element.attrs?.file
        if (!imageUrl) {
          continue
        }

        // 尝试从图片URL中提取（某些情况下二维码内容可能编码在URL中）
        // 如果API支持图片二维码解析，可以在这里调用
        // 目前先尝试从URL中提取文本（某些适配器可能会这样处理）
        ctx.logger('maibot').warn('图片二维码解析：目前需要用户直接发送SGID文本，图片解析功能待API支持')
        return null
      }
    }
  }

  return null
}

/**
 * 检查群是否在白名单中（如果白名单功能启用）
 */
function checkWhitelist(session: Session | null, config: Config): { allowed: boolean; message?: string } {
  if (!session) {
    return { allowed: true }  // 私聊允许
  }

  const whitelistConfig = config.whitelist || { enabled: false, guildIds: [], message: '' }
  
  // 如果白名单未启用，允许所有群
  if (!whitelistConfig.enabled) {
    return { allowed: true }
  }

  // 如果是私聊，允许
  if (!session.guildId) {
    return { allowed: true }
  }

  // 检查群ID是否在白名单中
  const guildId = String(session.guildId)
  if (whitelistConfig.guildIds.includes(guildId)) {
    return { allowed: true }
  }

  // 不在白名单中
  return { 
    allowed: false, 
    message: whitelistConfig.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。' 
  }
}

/**
 * 尝试撤回用户消息（如果支持）
 */
async function tryRecallMessage(
  session: Session,
  ctx: Context,
  config: Config,
  messageId?: string
): Promise<void> {
  const logger = ctx.logger('maibot')
  
  // 如果配置中关闭了自动撤回，则跳过
  if (config.autoRecall === false) {
    return
  }

  try {
    // 如果没有提供messageId，尝试从session中获取
    const targetMessageId = messageId || session.messageId
    
    if (!targetMessageId || !session.channelId) {
      logger.debug('无法撤回消息：缺少消息ID或频道ID')
      return
    }

    // 尝试使用bot的deleteMessage方法
    if (session.bot && typeof session.bot.deleteMessage === 'function') {
      await session.bot.deleteMessage(session.channelId, targetMessageId)
      logger.info(`已撤回用户 ${session.userId} 的消息: ${targetMessageId}`)
    } else {
      logger.debug('当前适配器不支持撤回消息功能')
    }
  } catch (error: any) {
    // 撤回失败时不抛出错误，只记录日志
    logger.debug(`尝试撤回消息失败（可能不支持该功能）: ${error?.message || '未知错误'}`)
  }
}

/**
 * 交互式获取二维码文本（qr_text）
 * 废弃旧的uid策略，每次都需要新的二维码
 * 不再使用binding.qrCode缓存，每次操作都要求用户提供新二维码
 */
async function getQrText(
  session: Session,
  ctx: Context,
  api: MaiBotAPI,
  binding: UserBinding | null,
  config: Config,
  timeout: number = 60000,
  promptMessage?: string
): Promise<{ qrText: string; error?: string; needRebind?: boolean }> {
  const logger = ctx.logger('maibot')
  
  // 废弃旧的uid策略，每次都需要新的二维码
  // 不再使用binding.qrCode缓存，直接提示用户输入
  
  const actualTimeout = timeout
  const message = promptMessage || `请在${actualTimeout / 1000}秒内发送SGID（长按玩家二维码识别后发送）或公众号提供的网页地址`
  
  try {
    await session.send(message)
    logger.info(`开始等待用户 ${session.userId} 输入SGID或网页地址，超时时间: ${actualTimeout}ms`)
    
    const promptText = await session.prompt(actualTimeout)
    
    if (!promptText || !promptText.trim()) {
      await session.send(`❌ 输入超时（${actualTimeout / 1000}秒）`)
      return { qrText: '', error: '超时未收到响应' }
    }
    
    const trimmed = promptText.trim()
    logger.debug(`收到用户输入: ${trimmed.substring(0, 50)}`)
    
    let qrText = trimmed
    
    // 检查是否为公众号网页地址格式（https://wq.wahlap.net/qrcode/req/）
    const isLink = trimmed.includes('https://wq.wahlap.net/qrcode/req/')
    const isSGID = trimmed.startsWith('SGWCMAID')
    
    // 如果是网页地址，提取MAID并转换为SGWCMAID格式
    if (isLink) {
      try {
        // 从URL中提取MAID部分：https://wq.wahlap.net/qrcode/req/MAID2601...55.html?...
        // 匹配 /qrcode/req/ 后面的 MAID 开头的内容（到 .html 或 ? 之前）
        const match = trimmed.match(/qrcode\/req\/(MAID[^?\.]+)/i)
        if (match && match[1]) {
          const maid = match[1]
          // 在前面加上 SGWC 变成 SGWCMAID...
          qrText = 'SGWC' + maid
          logger.info(`从网页地址提取MAID并转换: ${maid.substring(0, 20)}... -> ${qrText.substring(0, 24)}...`)
        } else {
          await session.send('⚠️ 无法从网页地址中提取MAID，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
          return { qrText: '', error: '无法从网页地址中提取MAID' }
        }
      } catch (error) {
        logger.warn('解析网页地址失败:', error)
        await session.send('⚠️ 网页地址格式错误，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
        return { qrText: '', error: '网页地址格式错误' }
      }
    } else if (!isSGID) {
      await session.send('⚠️ 未识别到有效的SGID格式或网页地址，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址（https://wq.wahlap.net/qrcode/req/...）')
      return { qrText: '', error: '无效的二维码格式，必须是SGID文本或网页地址' }
    }
    
    // 验证SGID格式和长度
    if (!qrText.startsWith('SGWCMAID')) {
      await session.send('❌ 转换后的格式错误，必须以 SGWCMAID 开头')
      return { qrText: '', error: 'SGID格式错误，必须以 SGWCMAID 开头' }
    }
    
    if (qrText.length < 48 || qrText.length > 128) {
      await session.send('❌ SGID长度错误，应在48-128字符之间')
      return { qrText: '', error: '二维码长度错误，应在48-128字符之间' }
    }
    
    logger.info(`✅ 接收到${isLink ? '网页地址（已转换）' : 'SGID'}: ${qrText.substring(0, 50)}...`)
    
    // 尝试撤回用户发送的消息（如果启用了自动撤回）
    await tryRecallMessage(session, ctx, config)
    
    await session.send('⏳ 正在处理，请稍候...')
    
    // 验证qrCode是否有效
    try {
      const preview = await api.getPreview(config.machineInfo.clientId, qrText)
      if (preview.UserID === -1 || (typeof preview.UserID === 'string' && preview.UserID === '-1')) {
        await session.send('❌ 无效或过期的二维码，请重新发送')
        return { qrText: '', error: '无效或过期的二维码' }
      }
      
      // 如果binding存在，更新数据库中的qrCode（仅用于记录，不再用于缓存）
      if (binding) {
        await ctx.database.set('maibot_bindings', { userId: binding.userId }, {
          qrCode: qrText,
        })
        logger.info(`已更新用户 ${binding.userId} 的qrCode（仅用于记录）`)
      }
      
      return { qrText: qrText }
    } catch (error: any) {
      logger.error('验证qrCode失败:', error)
      await session.send(`❌ 验证二维码失败：${error?.message || '未知错误'}`)
      return { qrText: '', error: `验证二维码失败：${error?.message || '未知错误'}` }
    }
  } catch (error: any) {
    logger.error(`等待用户输入二维码失败: ${error?.message}`, error)
    if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('未收到响应')) {
      await session.send(`❌ 输入超时（${actualTimeout / 1000}秒）`)
      return { qrText: '', error: '超时未收到响应' }
    }
    return { qrText: '', error: error?.message || '未知错误' }
  }
}

/**
 * 处理API调用失败，如果需要重新绑定则进入重新绑定流程
 */
async function handleApiFailure(
  session: Session,
  ctx: Context,
  api: MaiBotAPI,
  binding: UserBinding | null,
  config: Config,
  error: any,
  rebindTimeout: number
): Promise<{ success: boolean; error?: string; rebindResult?: { success: boolean; newBinding?: UserBinding; error?: string } }> {
  const logger = ctx.logger('maibot')
  
  // 检查错误是否表示需要重新绑定（例如UserID为-1，或qr_text相关错误）
  const needRebind = 
    error?.response?.data?.UserID === -1 ||
    error?.response?.data?.UserID === '-1' ||
    error?.message?.includes('二维码') ||
    error?.message?.includes('qr_text') ||
    error?.message?.includes('无效') ||
    error?.message?.includes('过期')
  
  if (needRebind && binding) {
    logger.info(`检测到需要重新绑定，用户: ${binding.userId}`)
    const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
    return { success: false, rebindResult }
  }
  
  return { success: false, error: error?.message || '未知错误' }
}

/**
 * 提示用户重新绑定二维码
 * 只支持用户输入SGID文本
 */
async function promptForRebind(
  session: Session,
  ctx: Context,
  api: MaiBotAPI,
  binding: UserBinding,
  config: Config,
  timeout: number = 60000
): Promise<{ success: boolean; newBinding?: UserBinding; error?: string; messageId?: string }> {
  const actualTimeout = timeout
  const logger = ctx.logger('maibot')
  
  // 发送提示消息
  let promptMessageId: string | undefined
  try {
    const sentMessage = await session.send(
      `❌ 二维码对应ID无法登陆，您需要重新绑定新的二维码，请在${actualTimeout / 1000}秒内发送SGID（长按玩家二维码识别后发送）或公众号提供的网页地址`
    )
    // 尝试从返回的消息中提取消息ID
    if (typeof sentMessage === 'string') {
      promptMessageId = sentMessage
    } else if (sentMessage && (sentMessage as any).messageId) {
      promptMessageId = (sentMessage as any).messageId
    }
  } catch (error) {
    logger.warn('发送提示消息失败:', error)
  }

  // 使用session.prompt等待用户输入SGID文本
  try {
    logger.info(`开始等待用户 ${session.userId} 重新绑定SGID，超时时间: ${actualTimeout}ms`)
    
    const promptText = await session.prompt(actualTimeout)
    
    if (!promptText || !promptText.trim()) {
      await session.send(`❌ 重新绑定超时（${actualTimeout / 1000}秒），请稍后使用 /mai绑定 重新绑定二维码`)
      return { success: false, error: '超时未收到响应', messageId: promptMessageId }
    }
    
    const trimmed = promptText.trim()
    logger.debug(`收到用户输入: ${trimmed.substring(0, 50)}`)
    
    let qrCode = trimmed
    
    // 检查是否为公众号网页地址格式（https://wq.wahlap.net/qrcode/req/）
    const isLink = trimmed.includes('https://wq.wahlap.net/qrcode/req/')
    const isSGID = trimmed.startsWith('SGWCMAID')
    
    // 如果是网页地址，提取MAID并转换为SGWCMAID格式
    if (isLink) {
      try {
        // 从URL中提取MAID部分：https://wq.wahlap.net/qrcode/req/MAID2601...55.html?...
        // 匹配 /qrcode/req/ 后面的 MAID 开头的内容（到 .html 或 ? 之前）
        const match = trimmed.match(/qrcode\/req\/(MAID[^?\.]+)/i)
        if (match && match[1]) {
          const maid = match[1]
          // 在前面加上 SGWC 变成 SGWCMAID...
          qrCode = 'SGWC' + maid
          logger.info(`从网页地址提取MAID并转换: ${maid.substring(0, 20)}... -> ${qrCode.substring(0, 24)}...`)
        } else {
          await session.send('⚠️ 无法从网页地址中提取MAID，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
          return { success: false, error: '无法从网页地址中提取MAID', messageId: promptMessageId }
        }
      } catch (error) {
        logger.warn('解析网页地址失败:', error)
        await session.send('⚠️ 网页地址格式错误，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
        return { success: false, error: '网页地址格式错误', messageId: promptMessageId }
      }
    } else if (!isSGID) {
      await session.send('⚠️ 未识别到有效的SGID格式或网页地址，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址（https://wq.wahlap.net/qrcode/req/...）')
      return { success: false, error: '无效的二维码格式，必须是SGID文本或网页地址', messageId: promptMessageId }
    }
    
    // 验证SGID格式和长度
    if (!qrCode.startsWith('SGWCMAID')) {
      await session.send('❌ 识别失败：格式错误，必须以 SGWCMAID 开头')
      return { success: false, error: 'SGID格式错误，必须以 SGWCMAID 开头', messageId: promptMessageId }
    }
    
    if (qrCode.length < 48 || qrCode.length > 128) {
      await session.send('❌ 识别失败：SGID长度错误，应在48-128字符之间')
      return { success: false, error: '二维码长度错误，应在48-128字符之间', messageId: promptMessageId }
    }
    
    logger.info(`✅ 接收到${isLink ? '网页地址（已转换）' : 'SGID'}: ${qrCode.substring(0, 50)}...`)
    
    // 发送识别中反馈
    await session.send('⏳ 正在处理，请稍候...')

    // 使用新API获取用户信息
    const machineInfo = config.machineInfo
    let previewResult
    try {
      previewResult = await api.getPreview(machineInfo.clientId, qrCode)
    } catch (error: any) {
      logger.error('获取用户预览信息失败:', error)
      await session.send(`❌ 绑定失败：无法从二维码获取用户信息\n错误信息: ${error?.message || '未知错误'}`)
      return { 
        success: false, 
        error: `绑定失败：无法从二维码获取用户信息\n错误信息: ${error?.message || '未知错误'}`,
        messageId: promptMessageId
      }
    }

    // 检查是否获取成功
    if (previewResult.UserID === -1 || (typeof previewResult.UserID === 'string' && previewResult.UserID === '-1')) {
      await session.send(`❌ 绑定失败：无效或过期的二维码`)
      return { 
        success: false, 
        error: '绑定失败：无效或过期的二维码',
        messageId: promptMessageId
      }
    }

    // UserID在新API中是加密的字符串
    const maiUid = String(previewResult.UserID)
    const userName = previewResult.UserName
    const rating = previewResult.Rating ? String(previewResult.Rating) : undefined

    // 更新数据库中的绑定
    await ctx.database.set('maibot_bindings', { userId: binding.userId }, {
      maiUid,
      qrCode,
      bindTime: new Date(),
      userName,
      rating,
    })

    // 发送成功反馈
    await session.send(`✅ 重新绑定成功！${userName ? `\n用户名: ${userName}` : ''}${rating ? `\nRating: ${rating}` : ''}\n\n⚠️ 为了确保账户安全，请手动撤回群内包含SGID的消息`)

    // 获取更新后的绑定
    const updated = await ctx.database.get('maibot_bindings', { userId: binding.userId })
    if (updated.length > 0) {
      return { success: true, newBinding: updated[0], messageId: promptMessageId }
    } else {
      await session.send('⚠️ 绑定已更新，但获取绑定信息失败')
      return { success: false, error: '更新绑定失败', messageId: promptMessageId }
    }
  } catch (error: any) {
    logger.error('重新绑定失败:', error)
    if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('未收到响应')) {
      await session.send(`❌ 重新绑定超时（${actualTimeout / 1000}秒），请稍后使用 /mai绑定 重新绑定二维码`)
      return { success: false, error: '超时未收到响应', messageId: promptMessageId }
    }
    await session.send(`❌ 重新绑定过程中发生错误：${error?.message || '未知错误'}`)
    return { success: false, error: error?.message || '未知错误', messageId: promptMessageId }
  }
}

export function apply(ctx: Context, config: Config) {
  // 扩展数据库
  extendDatabase(ctx)

  // 初始化API客户端
  const api = new MaiBotAPI({
    baseURL: config.apiBaseURL,
    timeout: config.apiTimeout,
  })
  const logger = ctx.logger('maibot')

  // 监听用户消息，尝试自动撤回包含SGID的消息
  if (config.autoRecall !== false) {
    ctx.on('message', async (session) => {
      // 只处理群聊消息
      if (!session.guildId || !session.userId) {
        return
      }

      // 检查消息内容是否包含SGID或二维码链接
      const content = session.content?.trim() || ''
      const isSGID = content.startsWith('SGWCMAID') || content.includes('https://wq.wahlap.net/qrcode/req/')
      
      if (isSGID && session.messageId && session.channelId) {
        // 延迟一小段时间后撤回（确保消息已被处理）
        setTimeout(async () => {
          await tryRecallMessage(session, ctx, config, session.messageId)
        }, 1000)
      }
    })
  }

  // 插件运行状态标志，用于在插件停止后阻止新的请求
  let isPluginActive = true
  ctx.on('dispose', () => {
    isPluginActive = false
    logger.info('插件已停止，将不再执行新的定时任务')
  })

  // 登录播报功能全局开关（管理员可控制）
  let alertFeatureEnabled = true

  // 从数据库加载/初始化管理员全局开关（保证重启不丢）
  const ALERT_FEATURE_KEY = 'alertFeatureEnabled'
  const loadAlertFeatureEnabled = async () => {
    try {
      const rows = await ctx.database.get('maibot_settings', { key: ALERT_FEATURE_KEY })
      if (rows.length > 0) {
        alertFeatureEnabled = rows[0].boolValue ?? true
        logger.info(`已从数据库加载登录播报全局开关: ${alertFeatureEnabled ? '开启' : '关闭'}`)
        return
      }
      await ctx.database.create('maibot_settings', {
        key: ALERT_FEATURE_KEY,
        boolValue: true,
        updatedAt: new Date(),
      })
      alertFeatureEnabled = true
      logger.info('已初始化登录播报全局开关为开启（写入数据库默认值）')
    } catch (e) {
      // 兜底：数据库异常不阻塞插件运行，继续使用内存默认值
      logger.warn('加载登录播报全局开关失败，将使用默认值 true：', e)
      alertFeatureEnabled = true
    }
  }

  const saveAlertFeatureEnabled = async (value: boolean) => {
    alertFeatureEnabled = value
    try {
      const rows = await ctx.database.get('maibot_settings', { key: ALERT_FEATURE_KEY })
      if (rows.length > 0) {
        await ctx.database.set('maibot_settings', { key: ALERT_FEATURE_KEY }, {
          boolValue: value,
          updatedAt: new Date(),
        })
      } else {
        await ctx.database.create('maibot_settings', {
          key: ALERT_FEATURE_KEY,
          boolValue: value,
          updatedAt: new Date(),
        })
      }
    } catch (e) {
      logger.warn('保存登录播报全局开关失败（已更新内存状态）：', e)
    }
  }

  // 插件启动后异步加载一次
  void loadAlertFeatureEnabled()

  // 使用配置中的值
  const machineInfo = config.machineInfo
  const turnstileToken = config.turnstileToken
  const maintenanceNotice = config.maintenanceNotice
  const confirmTimeout = config.confirmTimeout ?? 10000
  const rebindTimeout = config.rebindTimeout ?? 60000  // 默认60秒
  const authLevelForProxy = config.authLevelForProxy ?? 3
  const protectionLockMessage = config.protectionLockMessage ?? '🛡️ 保护模式：{playerid}{at} 你的账号已自动锁定成功'
  const maintenanceMode = config.maintenanceMode ?? false
  const maintenanceMessage = config.maintenanceMessage ?? '⚠️  Milk Server Studio 正在进行维护。具体清查阅 https://awmc.cc/'
  const hideLockAndProtection = config.hideLockAndProtection ?? false

  // 创建使用配置的 promptYes 函数
  const promptYesWithConfig = async (session: Session, message: string, timeout?: number): Promise<boolean> => {
    const actualTimeout = timeout ?? confirmTimeout
    await session.send(`${message}\n在${actualTimeout / 1000}秒内输入 Y 确认，其它输入取消`)
    try {
      const answer = await session.prompt(actualTimeout)
      return answer?.trim().toUpperCase() === 'Y'
    } catch {
      return false
    }
  }

  // 在 apply 函数内部使用 promptYesWithConfig 替代 promptYes
  // 为了简化，我们将直接修改所有调用，使用 promptYesWithConfig
  const promptYesLocal = promptYesWithConfig

  /**
   * 检查维护模式并返回相应的消息
   * 如果维护模式开启，返回维护消息；否则返回原始消息
   */
  function getMaintenanceModeMessage(originalMessage?: string): string {
    if (maintenanceMode) {
      return maintenanceMessage
    }
    return originalMessage || ''
  }

  // 维护模式中间件：拦截所有 maibot 插件的命令
  // 注意：使用 before('command') 来确保不会拦截所有消息
  ctx.middleware(async (session, next) => {
    if (!maintenanceMode) {
      return next()
    }
    
    // 检查是否是 maibot 插件的命令（所有 mai 开头的命令，包括 maialert）
    const content = session.content?.trim() || ''
    // 匹配所有 mai 开头的命令：/mai、mai、/maialert、maialert 等
    if (content.match(/^\/?mai/i)) {
      return maintenanceMessage
    }
    
    return next()
  }, true) // 设置为 true 使其在早期执行，但不影响普通消息

  /**
   * 从文本中提取用户ID（支持@userid格式、<at id="数字"/>格式或直接userid）
   */
  function extractUserId(text: string | undefined): string | null {
    if (!text) return null
    const trimmed = text.trim()
    
    // 尝试匹配 <at id="数字"/> 格式
    const atMatch = trimmed.match(/<at\s+id=["'](\d+)["']\s*\/?>/i)
    if (atMatch && atMatch[1]) {
      logger.debug(`从 @mention 标签中提取到用户ID: ${atMatch[1]}`)
      return atMatch[1]
    }
    
    // 移除@符号和空格，然后提取所有数字
    const cleaned = trimmed.replace(/^@/, '').trim()
    
    // 如果只包含数字，直接返回
    if (/^\d+$/.test(cleaned)) {
      logger.debug(`提取到纯数字用户ID: ${cleaned}`)
      return cleaned
    }
    
    // 如果包含其他字符，尝试提取其中的数字
    const numberMatch = cleaned.match(/\d+/)
    if (numberMatch) {
      logger.debug(`从文本 "${cleaned}" 中提取到数字ID: ${numberMatch[0]}`)
      return numberMatch[0]
    }
    
    logger.debug(`无法从文本 "${trimmed}" 中提取用户ID`)
    return null
  }

  /**
   * 检查权限并获取目标用户绑定
   * 如果提供了targetUserId，检查权限并使用目标用户
   * 否则使用当前用户
   */
  async function getTargetBinding(
    session: Session,
    targetUserIdText: string | undefined,
  ): Promise<{ binding: UserBinding | null, isProxy: boolean, error: string | null }> {
    const currentUserId = session.userId
    logger.debug(`getTargetBinding: 原始输入 = "${targetUserIdText}", 当前用户ID = ${currentUserId}`)
    
    const targetUserIdRaw = extractUserId(targetUserIdText)
    logger.debug(`getTargetBinding: 提取后的用户ID = "${targetUserIdRaw}"`)
    
    // 如果没有提供目标用户，使用当前用户
    if (!targetUserIdRaw) {
      logger.debug(`getTargetBinding: 未提供目标用户，使用当前用户 ${currentUserId}`)
      const bindings = await ctx.database.get('maibot_bindings', { userId: currentUserId })
      logger.debug(`getTargetBinding: 当前用户绑定数量 = ${bindings.length}`)
      if (bindings.length === 0) {
        return { binding: null, isProxy: false, error: '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定' }
      }
      return { binding: bindings[0], isProxy: false, error: null }
    }
    
    // 如果提供了目标用户，需要检查权限
    const userAuthority = (session.user as any)?.authority ?? 0
    logger.debug(`getTargetBinding: 当前用户权限 = ${userAuthority}, 需要权限 = ${authLevelForProxy}`)
    if (userAuthority < authLevelForProxy) {
      return { binding: null, isProxy: true, error: `❌ 权限不足，需要auth等级${authLevelForProxy}以上才能代操作` }
    }
    
    // 获取目标用户的绑定
    logger.debug(`getTargetBinding: 查询目标用户 ${targetUserIdRaw} 的绑定`)
    const bindings = await ctx.database.get('maibot_bindings', { userId: targetUserIdRaw })
    logger.debug(`getTargetBinding: 目标用户绑定数量 = ${bindings.length}`)
    if (bindings.length === 0) {
      logger.warn(`getTargetBinding: 用户 ${targetUserIdRaw} 尚未绑定账号（原始输入: "${targetUserIdText}"）`)
      return { binding: null, isProxy: true, error: `❌ 用户 ${targetUserIdRaw} 尚未绑定账号\n\n[Debug] 原始输入: "${targetUserIdText}"\n提取的ID: "${targetUserIdRaw}"\n请确认用户ID是否正确` }
    }
    
    logger.debug(`getTargetBinding: 成功获取目标用户 ${targetUserIdRaw} 的绑定`)
    return { binding: bindings[0], isProxy: true, error: null }
  }

  const scheduleB50Notification = (session: Session, taskId: string) => {
    const bot = session.bot
    const channelId = session.channelId
    if (!bot || !channelId) {
      logger.warn('无法追踪B50任务完成状态：bot或channel信息缺失')
      return
    }

    const mention = buildMention(session)
    const guildId = session.guildId
    const maxAttempts = 300  // 10分钟超时：300次 * 2秒 = 600秒 = 10分钟
    const interval = 2_000  // 每2秒轮询一次
    const initialDelay = 2_000  // 首次延迟2秒后开始检查
    let attempts = 0

    const poll = async () => {
      attempts += 1
      try {
        const detail = await api.getB50TaskById(taskId)
        
        // 检测 done === true 或者 error is not none 就停止
        const hasError = detail.error !== null && detail.error !== undefined && detail.error !== ''
        const isDone = detail.done === true
        
        if (isDone || hasError) {
          // 任务完成或出错，发送通知并停止
          const statusText = hasError
            ? `❌ 任务失败：${detail.error}`
            : '✅ 任务已完成'
          const finishTime = detail.alive_task_end_time
            ? `\n完成时间: ${new Date((typeof detail.alive_task_end_time === 'number' ? detail.alive_task_end_time : parseInt(String(detail.alive_task_end_time))) * 1000).toLocaleString('zh-CN')}`
            : ''
          await bot.sendMessage(
            channelId,
            `${mention} 水鱼B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`,
            guildId,
          )
          return
        }
        
        // 如果还没完成且没出错，继续轮询（在超时范围内）
        if (attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }

        let msg = `${mention} 水鱼B50任务 ${taskId} 上传失败，请稍后再试一次。`
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          msg += `\n${maintenanceMsg}`
        }
        await bot.sendMessage(
          channelId,
          msg,
          guildId,
        )
      } catch (error) {
        logger.warn('轮询B50任务状态失败', error)
        if (attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }
        let msg = `${mention} 水鱼B50任务 ${taskId} 上传失败，请稍后再试一次。`
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          msg += `\n${maintenanceMsg}`
        }
        await bot.sendMessage(
          channelId,
          msg,
          guildId,
        )
      }
    }

    // 首次延迟3秒后开始检查，之后每5秒轮询一次
    ctx.setTimeout(poll, initialDelay)
  }

  const scheduleLxB50Notification = (session: Session, taskId: string) => {
    const bot = session.bot
    const channelId = session.channelId
    if (!bot || !channelId) {
      logger.warn('无法追踪落雪B50任务完成状态：bot或channel信息缺失')
      return
    }

    const mention = buildMention(session)
    const guildId = session.guildId
    const maxAttempts = 300  // 10分钟超时：300次 * 2秒 = 600秒 = 10分钟
    const interval = 2_000  // 每2秒轮询一次
    const initialDelay = 2_000  // 首次延迟2秒后开始检查
    let attempts = 0

    const poll = async () => {
      attempts += 1
      try {
        const detail = await api.getLxB50TaskById(taskId)
        
        // 检测 done === true 或者 error is not none 就停止
        const hasError = detail.error !== null && detail.error !== undefined && detail.error !== ''
        const isDone = detail.done === true
        
        if (isDone || hasError) {
          // 任务完成或出错，发送通知并停止
          const statusText = hasError
            ? `❌ 任务失败：${detail.error}`
            : '✅ 任务已完成'
          const finishTime = detail.alive_task_end_time
            ? `\n完成时间: ${new Date((typeof detail.alive_task_end_time === 'number' ? detail.alive_task_end_time : parseInt(String(detail.alive_task_end_time))) * 1000).toLocaleString('zh-CN')}`
            : ''
          await bot.sendMessage(
            channelId,
            `${mention} 落雪B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`,
            guildId,
          )
          return
        }
        
        // 如果还没完成且没出错，继续轮询（在超时范围内）
        if (attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }

        let msg = `${mention} 落雪B50任务 ${taskId} 上传失败，请稍后再试一次。`
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          msg += `\n${maintenanceMsg}`
        }
        await bot.sendMessage(
          channelId,
          msg,
          guildId,
        )
      } catch (error) {
        logger.warn('轮询落雪B50任务状态失败', error)
        if (attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }
        let msg = `${mention} 落雪B50任务 ${taskId} 上传失败，请稍后再试一次。`
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          msg += `\n${maintenanceMsg}`
        }
        await bot.sendMessage(
          channelId,
          msg,
          guildId,
        )
      }
    }

    // 首次延迟2秒后开始检查，之后每1秒轮询一次
    ctx.setTimeout(poll, initialDelay)
  }

  /**
   * 帮助指令
   * 用法: /mai 或 /mai帮助 [--advanced] 显示高级功能（发票、收藏品、舞里程等）
   */
  ctx.command('mai [help:text]', '查看所有可用指令')
    .alias('mai帮助')
    .userFields(['authority'])
    .option('advanced', '--advanced  显示高级功能（发票、收藏品、舞里程等）')
    .action(async ({ session, options }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      // 获取用户权限
      const userAuthority = (session.user as any)?.authority ?? 0
      const canProxy = userAuthority >= authLevelForProxy

      let helpText = `📖 舞萌DX机器人指令帮助

🔐 账号管理：
  /mai绑定 - 绑定舞萌DX账号（支持SGID文本或公众号提供的网页地址）
  /mai解绑 - 解绑舞萌DX账号
  /mai状态 - 查询绑定状态
  /maiping - 测试机台连接`

      // 有权限的代操作命令
      if (canProxy) {
        helpText += `
  /mai状态 [@用户] - 查询他人绑定状态（需要auth等级${authLevelForProxy}以上）`
      }

      helpText += `

🐟 水鱼B50：
  /mai绑定水鱼 <token> - 绑定水鱼Token用于B50上传
  /mai解绑水鱼 - 解绑水鱼Token
  /mai上传B50 - 上传B50数据到水鱼`

      if (canProxy) {
        helpText += `
  /mai绑定水鱼 <token> [@用户] - 为他人绑定水鱼Token（需要auth等级${authLevelForProxy}以上）
  /mai解绑水鱼 [@用户] - 解绑他人的水鱼Token（需要auth等级${authLevelForProxy}以上）
  /mai上传B50 [@用户] - 为他人上传B50（需要auth等级${authLevelForProxy}以上）`
      }

      helpText += `

❄️ 落雪B50：
  /mai绑定落雪 <lxns_code> - 绑定落雪代码用于B50上传
  /mai解绑落雪 - 解绑落雪代码
  /mai上传落雪b50 [lxns_code] - 上传B50数据到落雪`

      if (canProxy) {
        helpText += `
  /mai绑定落雪 <lxns_code> [@用户] - 为他人绑定落雪代码（需要auth等级${authLevelForProxy}以上）
  /mai解绑落雪 [@用户] - 解绑他人的落雪代码（需要auth等级${authLevelForProxy}以上）
  /mai上传落雪b50 [lxns_code] [@用户] - 为他人上传落雪B50（需要auth等级${authLevelForProxy}以上）`
      }

      // 只有在使用 --advanced 参数时才显示高级功能（发票、收藏品、舞里程等）
      const showAdvanced = options?.advanced
      
      if (showAdvanced) {
        helpText += `

🎫 票券管理：
  /mai发票 [倍数] - 为账号发放功能票（2-6倍，默认2倍）
  /mai清票 - 清空账号的所有功能票`

        if (canProxy) {
          helpText += `
  /mai发票 [倍数] [@用户] - 为他人发放功能票（需要auth等级${authLevelForProxy}以上）
  /mai清票 [@用户] - 清空他人的功能票（需要auth等级${authLevelForProxy}以上）`
        }

        helpText += `

🎮 游戏功能：
  /mai舞里程 <里程数> - 为账号发放舞里程（必须是1000的倍数）`

        if (canProxy) {
          helpText += `
  /mai舞里程 <里程数> [@用户] - 为他人发放舞里程（需要auth等级${authLevelForProxy}以上）`
        }

        helpText += `

🎁 收藏品管理：
  /mai发收藏品 - 发放收藏品（交互式选择类别和ID）
  /mai清收藏品 - 清空收藏品（交互式选择类别和ID）`

        if (canProxy) {
          helpText += `
  /mai发收藏品 [@用户] - 为他人发放收藏品（需要auth等级${authLevelForProxy}以上）
  /mai清收藏品 [@用户] - 清空他人的收藏品（需要auth等级${authLevelForProxy}以上）`
        }
      }

      helpText += `

🔔 提醒功能：
  /maialert [on|off] - 开关账号状态播报功能`

      if (canProxy) {
        helpText += `
  /maialert set <用户ID> [on|off] - 设置他人的播报状态（需要auth等级${authLevelForProxy}以上）`
      }

      // 隐藏锁定和保护模式功能（如果hideLockAndProtection为true）
      if (!hideLockAndProtection) {
        helpText += `

🔒 账号锁定：
  /mai锁定 - 锁定账号，防止他人登录
  /mai解锁 - 解锁账号（仅限通过mai锁定指令锁定的账号）
  /mai逃离 - 解锁账号的别名`

        if (canProxy) {
          helpText += `
  /mai锁定 [@用户] - 锁定他人账号（需要auth等级${authLevelForProxy}以上）
  /mai解锁 [@用户] - 解锁他人账号（需要auth等级${authLevelForProxy}以上）`
        }

        helpText += `

🛡️ 保护模式：
  /mai保护模式 [on|off] - 开关账号保护模式（自动锁定已下线的账号）`

        if (canProxy) {
          helpText += `
  /mai保护模式 [on|off] [@用户] - 设置他人的保护模式（需要auth等级${authLevelForProxy}以上）`
        }
      }

      if (canProxy) {
        helpText += `

👑 管理员指令：
  /mai管理员关闭所有锁定和保护 - 一键关闭所有人的锁定模式和保护模式（需要auth等级${authLevelForProxy}以上）
  /mai管理员关闭登录播报 - 关闭/开启登录播报功能（需要auth等级${authLevelForProxy}以上）
  /mai管理员关闭所有播报 - 强制关闭所有人的maialert状态（需要auth等级${authLevelForProxy}以上）`
      }

      helpText += `

💬 交流与反馈：
如有问题或建议，请前往QQ群: 1072033605

📝 说明：
  - 绑定账号支持SGID文本或公众号提供的网页地址`

      if (canProxy) {
        helpText += `
  - 支持 [@用户] 参数进行代操作（需要auth等级${authLevelForProxy}以上）`
      }
      
      helpText += `
  - 部分指令支持 -bypass 参数绕过确认
  - 使用 /mai状态 --expired 可查看过期票券`

      return helpText
    })

  /**
   * Ping功能
   * 用法: /maiping
   */
  ctx.command('maiping', '测试机台连接')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        await session.send('⏳ 正在测试机台连接...')
        const result = await api.maiPing()
        
        if (result.returnCode === 1 && result.serverTime) {
          const serverTime = new Date(result.serverTime * 1000).toLocaleString('zh-CN')
          return `✅ 机台连接正常\n服务器时间: ${serverTime}`
        } else if (result.result === 'down') {
          return '❌ 机台连接失败，机台可能已下线'
        } else {
          return `⚠️ 机台状态未知\n返回结果: ${JSON.stringify(result)}`
        }
      } catch (error: any) {
        ctx.logger('maibot').error('Ping机台失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ Ping失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

// 这个 Fracture_Hikaritsu 不给我吃KFC，故挂在此处。 我很生气。
  /**
   * 绑定用户
   * 用法: /mai绑定 [SGWCMAID...]
   */
  ctx.command('mai绑定 [qrCode:text]', '绑定舞萌DX账号')
    .action(async ({ session }, qrCode) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      const userId = session.userId

      try {
        // 检查是否已绑定
        const existing = await ctx.database.get('maibot_bindings', { userId })
        if (existing.length > 0) {
          return `❌ 您已经绑定了账号\n绑定时间: ${new Date(existing[0].bindTime).toLocaleString('zh-CN')}\n\n如需重新绑定，请先使用 /mai解绑`
        }

        // 如果没有提供SGID，提示用户输入
        if (!qrCode) {
          const actualTimeout = rebindTimeout
          let promptMessageId: string | undefined
          try {
            const sentMessage = await session.send(
              `请在${actualTimeout / 1000}秒内发送SGID（长按玩家二维码识别后发送）或公众号提供的网页地址`
            )
            if (typeof sentMessage === 'string') {
              promptMessageId = sentMessage
            } else if (sentMessage && (sentMessage as any).messageId) {
              promptMessageId = (sentMessage as any).messageId
            }
          } catch (error) {
            ctx.logger('maibot').warn('发送提示消息失败:', error)
          }

          try {
            logger.info(`开始等待用户 ${session.userId} 输入SGID，超时时间: ${actualTimeout}ms`)
            
            // 使用session.prompt等待用户输入SGID文本
            const promptText = await session.prompt(actualTimeout)
            
            if (!promptText || !promptText.trim()) {
              throw new Error('超时未收到响应')
            }
            
            const trimmed = promptText.trim()
            logger.debug(`收到用户输入: ${trimmed.substring(0, 50)}`)
            
            qrCode = trimmed
            
            // 检查是否为公众号网页地址格式（https://wq.wahlap.net/qrcode/req/）
            const isLink = trimmed.includes('https://wq.wahlap.net/qrcode/req/')
            const isSGID = trimmed.startsWith('SGWCMAID')
            
            // 如果是网页地址，提取MAID并转换为SGWCMAID格式
            if (isLink) {
              try {
                // 从URL中提取MAID部分：https://wq.wahlap.net/qrcode/req/MAID2601...55.html?...
                // 匹配 /qrcode/req/ 后面的 MAID 开头的内容（到 .html 或 ? 之前）
                const match = trimmed.match(/qrcode\/req\/(MAID[^?\.]+)/i)
                if (match && match[1]) {
                  const maid = match[1]
                  // 在前面加上 SGWC 变成 SGWCMAID...
                  qrCode = 'SGWC' + maid
                  logger.info(`从网页地址提取MAID并转换: ${maid.substring(0, 20)}... -> ${qrCode.substring(0, 24)}...`)
                } else {
                  await session.send('⚠️ 无法从网页地址中提取MAID，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
                  throw new Error('无法从网页地址中提取MAID')
                }
              } catch (error) {
                logger.warn('解析网页地址失败:', error)
                await session.send('⚠️ 网页地址格式错误，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
                throw new Error('网页地址格式错误')
              }
            } else if (!isSGID) {
              await session.send('⚠️ 未识别到有效的SGID格式或网页地址，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址（https://wq.wahlap.net/qrcode/req/...）')
              throw new Error('无效的二维码格式，必须是SGID文本或网页地址')
            }
            
            // 验证SGID格式和长度
            if (!qrCode.startsWith('SGWCMAID')) {
              await session.send('⚠️ 未识别到有效的SGID格式，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址')
              throw new Error('无效的二维码格式，必须以 SGWCMAID 开头')
            }
            
            if (qrCode.length < 48 || qrCode.length > 128) {
              await session.send('❌ SGID长度错误，应在48-128字符之间')
              throw new Error('二维码长度错误，应在48-128字符之间')
            }
            
            logger.info(`✅ 接收到${isLink ? '网页地址（已转换）' : 'SGID'}: ${qrCode.substring(0, 50)}...`)
            
            // 发送识别中反馈
            await session.send('⏳ 正在处理，请稍候...')
          } catch (error: any) {
            logger.error(`等待用户输入二维码失败: ${error?.message}`, error)
            if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('未收到响应')) {
              await session.send(`❌ 绑定超时（${actualTimeout / 1000}秒），请稍后使用 /mai绑定 重新绑定`)
              return '❌ 超时未收到响应，绑定已取消'
            }
            if (error.message?.includes('无效的二维码')) {
              return `❌ 绑定失败：${error.message}`
            }
            await session.send(`❌ 绑定过程中发生错误：${error?.message || '未知错误'}`)
            return `❌ 绑定失败：${error?.message || '未知错误'}`
          }
        }

        // 检查是否为公众号网页地址格式（https://wq.wahlap.net/qrcode/req/）
        const isLink = qrCode.includes('https://wq.wahlap.net/qrcode/req/')
        const isSGID = qrCode.startsWith('SGWCMAID')
        
        // 如果是网页地址，提取MAID并转换为SGWCMAID格式
        if (isLink) {
          try {
            // 从URL中提取MAID部分：https://wq.wahlap.net/qrcode/req/MAID2601...55.html?...
            // 匹配 /qrcode/req/ 后面的 MAID 开头的内容（到 .html 或 ? 之前）
            const match = qrCode.match(/qrcode\/req\/(MAID[^?\.]+)/i)
            if (match && match[1]) {
              const maid = match[1]
              // 在前面加上 SGWC 变成 SGWCMAID...
              qrCode = 'SGWC' + maid
              logger.info(`从网页地址提取MAID并转换: ${maid.substring(0, 20)}... -> ${qrCode.substring(0, 24)}...`)
            } else {
              return '❌ 无法从网页地址中提取MAID，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址'
            }
          } catch (error) {
            logger.warn('解析网页地址失败:', error)
            return '❌ 网页地址格式错误，请发送SGID文本（SGWCMAID开头）或公众号提供的网页地址'
          }
        } else if (!isSGID) {
          return '❌ 二维码格式错误，必须是SGID文本（SGWCMAID开头）或公众号提供的网页地址（https://wq.wahlap.net/qrcode/req/...）'
        }
        
        // 验证SGID格式和长度
        if (!qrCode.startsWith('SGWCMAID')) {
          return '❌ 二维码格式错误，必须以 SGWCMAID 开头'
        }
        
        if (qrCode.length < 48 || qrCode.length > 128) {
          return '❌ 二维码长度错误，应在48-128字符之间'
        }

        // 使用新API获取用户信息（需要client_id）
        const machineInfo = config.machineInfo
        let previewResult
        try {
          previewResult = await api.getPreview(machineInfo.clientId, qrCode)
        } catch (error: any) {
          ctx.logger('maibot').error('获取用户预览信息失败:', error)
          return `❌ 绑定失败：无法从二维码获取用户信息\n错误信息: ${error?.message || '未知错误'}`
        }

        // 检查是否获取成功
        if (previewResult.UserID === -1 || (typeof previewResult.UserID === 'string' && previewResult.UserID === '-1')) {
          return `❌ 绑定失败：无效或过期的二维码`
        }

        // UserID在新API中是加密的字符串
        const maiUid = String(previewResult.UserID)
        const userName = previewResult.UserName
        const rating = previewResult.Rating ? String(previewResult.Rating) : undefined

        // 存储到数据库
        await ctx.database.create('maibot_bindings', {
          userId,
          maiUid,
          qrCode,
          bindTime: new Date(),
          userName,
          rating,
        })

        return `✅ 绑定成功！\n` +
               (userName ? `用户名: ${userName}\n` : '') +
               (rating ? `Rating: ${rating}\n` : '') +
               `绑定时间: ${new Date().toLocaleString('zh-CN')}\n\n` +
               `⚠️ 为了确保账户安全，请手动撤回群内包含SGID的消息`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 绑定失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 解绑用户
   * 用法: /mai解绑
   */
  ctx.command('mai解绑', '解绑舞萌DX账号')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      const userId = session.userId

      try {
        // 查找绑定记录
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 您还没有绑定账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        // 删除绑定记录
        await ctx.database.remove('maibot_bindings', { userId })

        return `✅ 解绑成功！`
      } catch (error: any) {
        ctx.logger('maibot').error('解绑失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 解绑失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 查询绑定状态
   * 用法: /mai状态 [--expired] [@用户id]
   */
  ctx.command('mai状态 [targetUserId:text]', '查询绑定状态')
    .userFields(['authority'])
    .option('expired', '--expired  显示过期票券')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId
        let statusInfo = `✅ 已绑定账号\n\n` +
                        `绑定时间: ${new Date(binding.bindTime).toLocaleString('zh-CN')}\n` +
                        `🚨 /maialert查看账号提醒状态\n`

        // 尝试获取最新状态并更新数据库（需要新二维码）
        try {
          // 废弃旧的uid策略，每次都需要新的二维码
          const qrTextResult = await getQrText(session, ctx, api, binding, config, rebindTimeout, '请在60秒内发送SGID（长按玩家二维码识别后发送）或公众号提供的网页地址以查询账号状态')
          if (qrTextResult.error) {
            statusInfo += `\n⚠️ 无法获取最新状态：${qrTextResult.error}`
          } else {
            try {
              const preview = await api.getPreview(machineInfo.clientId, qrTextResult.qrText)
              
              // 更新数据库中的用户名和Rating
              await ctx.database.set('maibot_bindings', { userId }, {
                userName: preview.UserName,
                rating: preview.Rating ? String(preview.Rating) : undefined,
              })
              
              // 格式化版本信息
              let versionInfo = ''
              if (preview.RomVersion && preview.DataVersion) {
                // 机台版本：取前两个数字，如 1.52.00 -> 1.52
                const romVersionMatch = preview.RomVersion.match(/^(\d+\.\d+)/)
                const romVersion = romVersionMatch ? romVersionMatch[1] : preview.RomVersion
                
                // 数据版本：取前两个数字 + 最后两个数字转换为字母，如 1.50.09 -> 1.50 - I
                const dataVersionPrefixMatch = preview.DataVersion.match(/^(\d+\.\d+)/)
                const dataVersionPrefix = dataVersionPrefixMatch ? dataVersionPrefixMatch[1] : preview.DataVersion
                
                // 从版本号末尾提取最后两位数字，如 "1.50.01" -> "01", "1.50.09" -> "09"
                // 匹配最后一个点后的数字（确保只匹配版本号末尾）
                let dataVersionLetter = '';
                // 匹配最后一个点后的1-2位数字
                const dataVersionMatch = preview.DataVersion.match(/\.(\d{1,2})$/);
                
                if (dataVersionMatch) {
                  // 提取数字字符串，如 "09" 或 "9"
                  const digitsStr = dataVersionMatch[1];
                  // 转换为数字，如 "09" -> 9, "9" -> 9
                  const versionNumber = parseInt(digitsStr, 10);
                  
                  // 验证转换是否正确
                  if (!isNaN(versionNumber) && versionNumber >= 1) {
                    // 01 -> A, 02 -> B, ..., 09 -> I, 10 -> J, ..., 26 -> Z
                    // 使用模运算确保在 A-Z 范围内循环（27 -> A, 28 -> B, ...）
                    const letterIndex = ((versionNumber - 1) % 26) + 1;
                    // 转换为大写字母：A=65, B=66, ..., Z=90
                    dataVersionLetter = String.fromCharCode(64 + letterIndex).toUpperCase();
                  }
                }
                
                versionInfo = `机台版本: ${romVersion}\n` +
                             `数据版本: ${dataVersionPrefix} - ${dataVersionLetter}\n`
              }
              
              statusInfo += `\n📊 账号信息：\n` +
                           `用户名: ${preview.UserName || '未知'}\n` +
                           `Rating: ${preview.Rating || '未知'}\n` +
                           (versionInfo ? versionInfo : '') +
                           `登录状态: ${preview.IsLogin === true ? '已登录' : '未登录'}\n` +
                           `封禁状态: ${preview.BanState === 0 ? '正常' : '已封禁'}\n`
            } catch (error) {
              logger.warn('获取用户预览信息失败:', error)
              statusInfo += `\n⚠️ 无法获取最新状态，请检查API服务`
            }
          }
        } catch (error) {
          // 如果获取失败，使用缓存的信息
          if (binding.userName) {
            statusInfo += `\n📊 账号信息（缓存）：\n` +
                         `用户名: ${binding.userName}\n` +
                         (binding.rating ? `Rating: ${binding.rating}\n` : '')
          }
          statusInfo += `\n⚠️ 无法获取最新状态，请检查API服务`
        }

        // 显示水鱼Token绑定状态
        if (binding.fishToken) {
          statusInfo += `\n\n🐟 水鱼Token: 已绑定`
        } else {
          statusInfo += `\n\n🐟 水鱼Token: 未绑定\n使用 /mai绑定水鱼 <token> 进行绑定`
        }

        // 显示落雪代码绑定状态
        if (binding.lxnsCode) {
          statusInfo += `\n\n❄️ 落雪代码: 已绑定`
        } else {
          statusInfo += `\n\n❄️ 落雪代码: 未绑定\n使用 /mai绑定落雪 <lxns_code> 进行绑定`
        }

        // 显示保护模式状态（如果未隐藏）
        if (!hideLockAndProtection) {
          if (binding.protectionMode) {
            statusInfo += `\n\n🛡️ 保护模式: 已开启\n使用 /mai保护模式 off 关闭`
          } else {
            statusInfo += `\n\n🛡️ 保护模式: 未开启\n使用 /mai保护模式 on 开启（自动锁定已下线的账号）`
          }

          // 显示锁定状态（不显示LoginId）
          if (binding.isLocked) {
            const lockTime = binding.lockTime 
              ? new Date(binding.lockTime).toLocaleString('zh-CN')
              : '未知'
            statusInfo += `\n\n🔒 锁定状态: 已锁定`
            statusInfo += `\n锁定时间: ${lockTime}`
            statusInfo += `\n使用 /mai解锁 可以解锁账号`
          } else {
            statusInfo += `\n\n🔒 锁定状态: 未锁定\n使用 /mai锁定 可以锁定账号（防止他人登录）`
          }
        }

        // 显示票券信息
        // @deprecated getCharge功能已在新API中移除，已注释
        statusInfo += `\n\n🎫 票券情况: 此功能已在新API中移除`

        return statusInfo
      } catch (error: any) {
        ctx.logger('maibot').error('查询状态失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 查询失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 锁定账号（登录保持）
   * 用法: /mai锁定
   * @deprecated 锁定功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai锁定 [targetUserId:text]', '锁定账号，防止他人登录')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查隐藏模式
      if (hideLockAndProtection) {
        return '❌ 该功能已禁用'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        
        // 检查是否已经锁定
        if (binding.isLocked) {
          const lockTime = binding.lockTime 
            ? new Date(binding.lockTime).toLocaleString('zh-CN')
            : '未知'
          return `⚠️ 账号已经锁定\n锁定时间: ${lockTime}\n使用 /mai解锁 可以解锁账号`
        }

        // 确认操作
        if (!options?.bypass) {
          const confirm = await promptYesLocal(session, `⚠️ 即将锁定账号\n锁定后账号将保持登录状态，防止他人登录\n确认继续？`)
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('⏳ 正在锁定账号，请稍候...')

        // 调用登录API锁定账号
        const result = await api.login(
          binding.maiUid,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.clientId,
          turnstileToken,
        )

        if (!result.LoginStatus) {
          if (result.UserID === -2) {
            return '❌ 锁定失败：Turnstile校验失败，请检查token配置'
          }
          return '❌ 锁定失败，服务端未返回成功状态，请稍后重试。请点击获取二维码刷新账号后再试。'
        }

        // 保存锁定信息到数据库，同时关闭 maialert 推送（如果之前是开启的）
        const updateData: any = {
          isLocked: true,
          lockTime: new Date(),
          lockLoginId: result.LoginId,
        }
        
        // 如果之前开启了推送，锁定时自动关闭
        if (binding.alertEnabled === true) {
          updateData.alertEnabled = false
          logger.info(`用户 ${userId} 锁定账号，已自动关闭 maialert 推送`)
        }

        await ctx.database.set('maibot_bindings', { userId }, updateData)

        let message = `✅ 账号已锁定\n` +
               `锁定时间: ${new Date().toLocaleString('zh-CN')}\n\n`
        
        if (binding.alertEnabled === true) {
          message += `⚠️ 已自动关闭 maialert 推送（锁定期间不会收到上线/下线提醒）\n`
        }
        
        message += `使用 /mai解锁 可以解锁账号`

        return message
      } catch (error: any) {
        logger.error('锁定账号失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          if (error.response.status === 401) {
            return `❌ 锁定失败：Turnstile校验失败，请检查token配置\n\n${maintenanceMessage}`
          }
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 锁定失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 解锁账号（登出）
   * 用法: /mai解锁
   * @deprecated 解锁功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai解锁 [targetUserId:text]', '解锁账号（仅限通过mai锁定指令锁定的账号）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .alias('mai逃离小黑屋')
    .alias('mai逃离')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查隐藏模式
      if (hideLockAndProtection) {
        return '❌ 该功能已禁用'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 检查是否通过mai锁定指令锁定
        if (!binding.isLocked) {
          return '⚠️ 账号未锁定\n\n目前只能解锁由 /mai锁定 指令发起的账户。\n其他登录暂时无法解锁。'
        }

        // 确认操作
        if (!options?.bypass) {
          const proxyTip = isProxy ? `（代操作用户 ${userId}）` : ''
          const confirm = await promptYesLocal(session, `⚠️ 即将解锁账号${proxyTip}\n确认继续？`)
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('⏳ 正在解锁账号，请稍候...')

        const result = await api.logout(
          binding.maiUid,
          machineInfo.regionId.toString(),
          machineInfo.clientId,
          machineInfo.placeId.toString(),
          turnstileToken,
        )

        if (!result.LogoutStatus) {
          return '❌ 解锁失败，服务端未返回成功状态，请稍后重试'
        }

        // 清除锁定信息（如果开启了保护模式，不关闭保护模式，让它继续监控）
        await ctx.database.set('maibot_bindings', { userId }, {
          isLocked: false,
          lockTime: null,
          lockLoginId: null,
        })

        let message = `✅ 账号已解锁\n` +
               `建议稍等片刻再登录`
        
        // 如果开启了保护模式，提示用户保护模式会继续监控
        if (binding.protectionMode) {
          message += `\n\n🛡️ 保护模式仍开启，系统会在检测到账号下线时自动尝试锁定`
        }

        return message
      } catch (error: any) {
        logger.error('解锁账号失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 解锁失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 绑定水鱼Token
   * 用法: /mai绑定水鱼 [fishToken]
   */
  ctx.command('mai绑定水鱼 [fishToken:text] [targetUserId:text]', '绑定水鱼Token用于B50上传')
    .userFields(['authority'])
    .action(async ({ session }, fishToken, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 如果没有提供Token，提示用户交互式输入
        if (!fishToken) {
          const actualTimeout = rebindTimeout
          try {
            await session.send(`请在${actualTimeout / 1000}秒内发送水鱼Token（长度应在127-132字符之间）`)
            
            const promptText = await session.prompt(actualTimeout)
            
            if (!promptText || !promptText.trim()) {
              return `❌ 输入超时（${actualTimeout / 1000}秒），绑定已取消`
            }
            
            fishToken = promptText.trim()
          } catch (error: any) {
            logger.error(`等待用户输入水鱼Token失败: ${error?.message}`, error)
            if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('未收到响应')) {
              return `❌ 输入超时（${actualTimeout / 1000}秒），绑定已取消`
            }
            return `❌ 绑定失败：${error?.message || '未知错误'}`
          }
        }

        // 验证Token长度
        if (fishToken.length < 127 || fishToken.length > 132) {
          return '❌ Token长度错误，应在127-132字符之间'
        }

        // 更新水鱼Token
        await ctx.database.set('maibot_bindings', { userId }, {
          fishToken,
        })

        return `✅ 水鱼Token绑定成功！\nToken: ${fishToken.substring(0, 8)}***${fishToken.substring(fishToken.length - 4)}`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定水鱼Token失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 绑定失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 解绑水鱼Token
   * 用法: /mai解绑水鱼
   */
  ctx.command('mai解绑水鱼 [targetUserId:text]', '解绑水鱼Token（保留舞萌DX账号绑定）')
    .userFields(['authority'])
    .action(async ({ session }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 检查是否已绑定水鱼Token
        if (!binding.fishToken) {
          return '❌ 您还没有绑定水鱼Token\n使用 /mai绑定水鱼 <token> 进行绑定'
        }

        // 清除水鱼Token（设置为空字符串）
        await ctx.database.set('maibot_bindings', { userId }, {
          fishToken: '',
        })

        return `✅ 水鱼Token解绑成功！\n已解绑的Token: ${binding.fishToken.substring(0, 8)}***${binding.fishToken.substring(binding.fishToken.length - 4)}\n\n舞萌DX账号绑定仍保留`
      } catch (error: any) {
        ctx.logger('maibot').error('解绑水鱼Token失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 解绑失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 绑定落雪代码
   * 用法: /mai绑定落雪 [lxnsCode]
   */
  ctx.command('mai绑定落雪 [lxnsCode:text] [targetUserId:text]', '绑定落雪代码用于B50上传')
    .userFields(['authority'])
    .action(async ({ session }, lxnsCode, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 如果没有提供落雪代码，提示用户交互式输入
        if (!lxnsCode) {
          const actualTimeout = rebindTimeout
          try {
            await session.send(`请在${actualTimeout / 1000}秒内发送落雪代码（长度必须为15个字符）`)
            
            const promptText = await session.prompt(actualTimeout)
            
            if (!promptText || !promptText.trim()) {
              return `❌ 输入超时（${actualTimeout / 1000}秒），绑定已取消`
            }
            
            lxnsCode = promptText.trim()
          } catch (error: any) {
            logger.error(`等待用户输入落雪代码失败: ${error?.message}`, error)
            if (error.message?.includes('超时') || error.message?.includes('timeout') || error.message?.includes('未收到响应')) {
              return `❌ 输入超时（${actualTimeout / 1000}秒），绑定已取消`
            }
            return `❌ 绑定失败：${error?.message || '未知错误'}`
          }
        }

        // 验证代码长度
        if (lxnsCode.length !== 15) {
          return '❌ 落雪代码长度错误，必须为15个字符'
        }

        // 更新落雪代码
        await ctx.database.set('maibot_bindings', { userId }, {
          lxnsCode,
        })

        return `✅ 落雪代码绑定成功！\n代码: ${lxnsCode.substring(0, 5)}***${lxnsCode.substring(lxnsCode.length - 3)}`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定落雪代码失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 绑定失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 解绑落雪代码
   * 用法: /mai解绑落雪
   */
  ctx.command('mai解绑落雪 [targetUserId:text]', '解绑落雪代码（保留舞萌DX账号绑定）')
    .userFields(['authority'])
    .action(async ({ session }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 检查是否已绑定落雪代码
        if (!binding.lxnsCode) {
          return '❌ 您还没有绑定落雪代码\n使用 /mai绑定落雪 <lxns_code> 进行绑定'
        }

        // 清除落雪代码（设置为空字符串）
        await ctx.database.set('maibot_bindings', { userId }, {
          lxnsCode: '',
        })

        return `✅ 落雪代码解绑成功！\n已解绑的代码: ${binding.lxnsCode.substring(0, 5)}***${binding.lxnsCode.substring(binding.lxnsCode.length - 3)}\n\n舞萌DX账号绑定仍保留`
      } catch (error: any) {
        ctx.logger('maibot').error('解绑落雪代码失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 解绑失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 发票（2-6倍票）
   * 用法: /mai发票 [倍数] [@用户id]，默认2
   */
  ctx.command('mai发票 [multiple:number] [targetUserId:text]', '为账号发放功能票（2-6倍）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, multipleInput, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      const multiple = multipleInput ? Number(multipleInput) : 2
      if (!Number.isInteger(multiple) || multiple < 2 || multiple > 6) {
        return '❌ 倍数必须是2-6之间的整数\n例如：/mai发票 3\n例如：/mai发票 6 @userid'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId
        const proxyTip = isProxy ? `（代操作用户 ${userId}）` : ''
        
        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const baseTip = `⚠️ 即将发放 ${multiple} 倍票${proxyTip}`
          const confirmFirst = await promptYesLocal(session, `${baseTip}\n操作具有风险，请谨慎`)
          if (!confirmFirst) {
            return '操作已取消（第一次确认未通过）'
          }

          const confirmSecond = await promptYesLocal(session, '二次确认：若理解风险，请再次输入 Y 执行')
          if (!confirmSecond) {
            return '操作已取消（第二次确认未通过）'
          }

          if (multiple >= 3) {
            const confirmThird = await promptYesLocal(session, '第三次确认：3倍及以上票券风险更高，确定继续？')
            if (!confirmThird) {
              return '操作已取消（第三次确认未通过）'
            }
          }
        }

        // 获取qr_text（交互式或从绑定中获取）
        const qrTextResult = await getQrText(session, ctx, api, binding, config, rebindTimeout)
        if (qrTextResult.error) {
          if (qrTextResult.needRebind) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (!rebindResult.success) {
              return `❌ 重新绑定失败：${rebindResult.error || '未知错误'}\n请使用 /mai绑定 重新绑定二维码`
            }
            // 重新绑定成功后，使用新的binding
            const updatedBinding = rebindResult.newBinding || binding
            const retryQrText = await getQrText(session, ctx, api, updatedBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 获取二维码失败：${retryQrText.error}`
            }
            // 使用新的qrText继续
            await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')
            const ticketResult = await api.getTicket(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              multiple,
              retryQrText.qrText
            )
            if (!ticketResult.TicketStatus || !ticketResult.LoginStatus || !ticketResult.LogoutStatus) {
              return '❌ 发放功能票失败：服务器返回未成功，请稍后再试'
            }
            return `✅ 已发放 ${multiple} 倍票\n请稍等几分钟在游戏内确认`
          }
          return `❌ 获取二维码失败：${qrTextResult.error}`
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        // 使用新API获取功能票（需要qr_text）
        let ticketResult
        try {
          ticketResult = await api.getTicket(
            machineInfo.regionId,
            machineInfo.clientId,
            machineInfo.placeId,
            multiple,
            qrTextResult.qrText
          )
        } catch (error: any) {
          // 如果API返回失败，可能需要重新绑定
          const failureResult = await handleApiFailure(session, ctx, api, binding, config, error, rebindTimeout)
          if (failureResult.rebindResult && failureResult.rebindResult.success && failureResult.rebindResult.newBinding) {
            // 重新绑定成功，重试获取功能票
            const retryQrText = await getQrText(session, ctx, api, failureResult.rebindResult.newBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 重新绑定后获取二维码失败：${retryQrText.error}`
            }
            ticketResult = await api.getTicket(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              multiple,
              retryQrText.qrText
            )
          } else {
            throw error
          }
        }

        if (!ticketResult.TicketStatus || !ticketResult.LoginStatus || !ticketResult.LogoutStatus) {
          // 如果返回失败，可能需要重新绑定
          if (!ticketResult.QrStatus || ticketResult.LoginStatus === false) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (rebindResult.success && rebindResult.newBinding) {
              return `✅ 重新绑定成功！请重新执行发票操作。`
            }
            return `❌ 发放功能票失败：服务器返回未成功\n重新绑定失败：${rebindResult.error || '未知错误'}`
          }
          return '❌ 发票失败：服务器返回未成功，请确认是否已在短时间内多次执行发票指令或稍后再试或点击获取二维码刷新账号后再试。'
        }

        return `✅ 已发放 ${multiple} 倍票\n请稍等几分钟在游戏内确认`
      } catch (error: any) {
        logger.error('发票失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 发票失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 舞里程发放 / 签到
   * 用法: /mai舞里程 <里程数>
   * @deprecated 发舞里程功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai舞里程 <mile:number> [targetUserId:text]', '为账号发放舞里程（maimile）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, mileInput, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const mile = Number(mileInput)
      if (!Number.isInteger(mile) || mile <= 0) {
        return '❌ 舞里程必须是大于 0 的整数'
      }

      // 安全逻辑：必须是 1000 的倍数，且小于 99999
      if (mile % 1000 !== 0) {
        return '❌ 舞里程必须是 1000 的倍数，例如：1000 / 2000 / 5000'
      }
      if (mile >= 99999) {
        return '❌ 舞里程过大，请控制在 99999 以下'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId
        const proxyTip = isProxy ? `（代操作用户 ${userId}）` : ''
        
        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const baseTip = `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放 ${mile} 点舞里程${proxyTip}`
          const confirmFirst = await promptYesLocal(session, `${baseTip}\n操作具有风险，请谨慎`)
          if (!confirmFirst) {
            return '操作已取消（第一次确认未通过）'
          }

          const confirmSecond = await promptYesLocal(session, '二次确认：若理解风险，请再次输入 Y 执行')
          if (!confirmSecond) {
            return '操作已取消（第二次确认未通过）'
          }
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        const result = await api.maimile(
          binding.maiUid,
          mile,
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
        )

        if (
          result.MileStatus === false ||
          result.LoginStatus === false ||
          result.LogoutStatus === false
        ) {
          return '❌ 发放舞里程失败：服务器返回未成功，请稍后再试'
        }

        const current = typeof result.CurrentMile === 'number'
          ? `\n当前舞里程：${result.CurrentMile}`
          : ''

        return `✅ 已为 ${maskUserId(binding.maiUid)} 发放 ${mile} 点舞里程${current}`
      } catch (error: any) {
        logger.error('发舞里程失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 发放舞里程失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 上传B50到水鱼
   * 用法: /mai上传B50 [@用户id]
   */
  ctx.command('mai上传B50 [targetUserId:text]', '上传B50数据到水鱼')
    .userFields(['authority'])
    .action(async ({ session }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 检查是否已绑定水鱼Token
        if (!binding.fishToken) {
          return '❌ 请先绑定水鱼Token\n使用 /mai绑定水鱼 <token> 进行绑定'
        }

        // 维护时间内直接提示，不发起上传请求
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          return maintenanceMsg
        }

        // 获取qr_text（交互式或从绑定中获取）
        const qrTextResult = await getQrText(session, ctx, api, binding, config, rebindTimeout)
        if (qrTextResult.error) {
          if (qrTextResult.needRebind) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (!rebindResult.success) {
              return `❌ 重新绑定失败：${rebindResult.error || '未知错误'}\n请使用 /mai绑定 重新绑定二维码`
            }
            // 重新绑定成功后，使用新的binding
            const updatedBinding = rebindResult.newBinding || binding
            const retryQrText = await getQrText(session, ctx, api, updatedBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 获取二维码失败：${retryQrText.error}`
            }
            // 使用新的qrText继续
            const result = await api.uploadB50(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              retryQrText.qrText,
              binding.fishToken
            )
            if (!result.UploadStatus) {
              if (result.msg === '该账号下存在未完成的任务') {
                return '⚠️ 当前账号已有未完成的水鱼B50任务，请稍后再试，无需重复上传。'
              }
              return `❌ 上传失败：${result.msg || '未知错误'}`
            }
            scheduleB50Notification(session, result.task_id)
            return `✅ B50上传任务已提交！\n任务ID: ${result.task_id}\n\n请耐心等待任务完成，预计1-10分钟`
          }
          return `❌ 获取二维码失败：${qrTextResult.error}`
        }

        // 上传B50（使用新API，需要qr_text）
        let result
        try {
          result = await api.uploadB50(
            machineInfo.regionId,
            machineInfo.clientId,
            machineInfo.placeId,
            qrTextResult.qrText,
            binding.fishToken
          )
        } catch (error: any) {
          // 如果API返回失败，可能需要重新绑定
          const failureResult = await handleApiFailure(session, ctx, api, binding, config, error, rebindTimeout)
          if (failureResult.rebindResult && failureResult.rebindResult.success && failureResult.rebindResult.newBinding) {
            // 重新绑定成功，重试上传
            const retryQrText = await getQrText(session, ctx, api, failureResult.rebindResult.newBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 重新绑定后获取二维码失败：${retryQrText.error}`
            }
            result = await api.uploadB50(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              retryQrText.qrText,
              binding.fishToken
            )
          } else {
            throw error
          }
        }

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的水鱼B50任务，请耐心等待任务完成，预计1-10分钟，无需重复上传。'
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的水鱼B50任务，请耐心等待任务完成，预计1-10分钟，无需重复上传。'
          }
          // 如果返回失败，可能需要重新绑定
          if (result.msg?.includes('二维码') || result.msg?.includes('qr_text') || result.msg?.includes('无效')) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (rebindResult.success && rebindResult.newBinding) {
              return `✅ 重新绑定成功！请重新执行上传操作。`
            }
            return `❌ 上传失败：${result.msg || '未知错误'}\n重新绑定失败：${rebindResult.error || '未知错误'}`
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        scheduleB50Notification(session, result.task_id)

        return `✅ B50上传任务已提交！\n任务ID: ${result.task_id}\n\n请耐心等待任务完成，预计1-10分钟`
      } catch (error: any) {
        ctx.logger('maibot').error('上传B50失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        // 处理请求超时类错误，统一提示
        if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
          let msg = '水鱼B50任务 上传失败，请稍后再试一次。'
          const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
          if (maintenanceMsg) {
            msg += `\n${maintenanceMsg}`
          }
          msg += `\n\n${maintenanceMessage}`
          return msg
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 上传失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 清空功能票
   * 用法: /mai清票
   * @deprecated 清票功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai清票 [targetUserId:text]', '清空账号的所有功能票')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId
        const proxyTip = isProxy ? `（代操作用户 ${userId}）` : ''
        
        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const confirm = await promptYesLocal(session, `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的所有功能票${proxyTip}，确认继续？`)
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        const result = await api.clearTicket(
          binding.maiUid,
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
        )

        // 检查4个状态字段是否都是 true
        const loginStatus = result.LoginStatus === true
        const logoutStatus = result.LogoutStatus === true
        const userAllStatus = result.UserAllStatus === true
        const userLogStatus = result.UserLogStatus === true

        // 如果4个状态都是 true，则清票成功
        if (loginStatus && logoutStatus && userAllStatus && userLogStatus) {
          return `✅ 已清空 ${maskUserId(binding.maiUid)} 的所有功能票`
        }

        // 如果4个状态都是 false，需要重新绑定二维码
        if (checkAllStatusFalse(result)) {
          await session.send('🔄 二维码已失效，需要重新绑定后才能继续操作')
          const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
          if (rebindResult.success && rebindResult.newBinding) {
            // 重新绑定成功后，尝试再次清票
            try {
              await session.send('⏳ 重新绑定成功，正在重新执行清票操作...')
              const retryResult = await api.clearTicket(
                rebindResult.newBinding.maiUid,
                machineInfo.clientId,
                machineInfo.regionId,
                machineInfo.placeId,
                machineInfo.placeName,
                machineInfo.regionName,
              )
              
              if (checkAllStatusFalse(retryResult)) {
                await session.send('❌ 重新绑定后清票仍然失败，请检查二维码是否正确')
                return `❌ 重新绑定后清票仍然失败\n错误信息： ${JSON.stringify(retryResult)}`
              }
              
              const retryLoginStatus = retryResult.LoginStatus === true
              const retryLogoutStatus = retryResult.LogoutStatus === true
              const retryUserAllStatus = retryResult.UserAllStatus === true
              const retryUserLogStatus = retryResult.UserLogStatus === true

              if (retryLoginStatus && retryLogoutStatus && retryUserAllStatus && retryUserLogStatus) {
                return `✅ 重新绑定成功！已清空 ${maskUserId(rebindResult.newBinding.maiUid)} 的所有功能票`
              }
              
              return `⚠️ 重新绑定成功，但清票部分失败\n错误信息： ${JSON.stringify(retryResult)}`
            } catch (retryError) {
              logger.error('重新绑定后清票失败:', retryError)
              return `✅ 重新绑定成功，但清票操作失败，请稍后重试`
            }
          } else {
            return `❌ 重新绑定失败：${rebindResult.error || '未知错误'}\n请使用 /mai绑定 重新绑定二维码`
          }
        }

        // 其他失败情况，显示详细错误信息
        return `❌ 清票失败\n错误信息： ${JSON.stringify(result)}`
      } catch (error: any) {
        logger.error('清票失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          const errorInfo = error.response.data ? JSON.stringify(error.response.data) : `${error.response.status} ${error.response.statusText}`
          return `❌ API请求失败\n错误信息： ${errorInfo}\n\n${maintenanceMessage}`
        }
        return `❌ 清票失败\n错误信息： ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  // 查询B50任务状态功能已暂时取消

  /**
   * 发收藏品
   * 用法: /mai发收藏品
   * @deprecated 发收藏品功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai发收藏品 [targetUserId:text]', '发放收藏品')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 交互式选择收藏品类别
        const itemKind = await promptCollectionType(session)
        if (itemKind === null) {
          return '操作已取消'
        }

        const selectedType = COLLECTION_TYPE_OPTIONS.find(opt => opt.value === itemKind)
        await session.send(
          `已选择：${selectedType?.label} (${itemKind})\n\n` +
          `请输入收藏品ID（数字）\n` +
          `如果不知道收藏品ID，请前往 https://sdgb.lemonno.xyz/ 查询\n` +
          `乐曲解禁请输入乐曲ID\n\n` +
          `输入0取消操作`
        )

        const itemIdInput = await session.prompt(60000)
        if (!itemIdInput || itemIdInput.trim() === '0') {
          return '操作已取消'
        }

        const itemId = itemIdInput.trim()
        // 验证ID是否为数字
        if (!/^\d+$/.test(itemId)) {
          return '❌ ID必须是数字，请重新输入'
        }

        const confirm = await promptYesLocal(
          session,
          `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放收藏品\n类型: ${selectedType?.label} (${itemKind})\nID: ${itemId}\n确认继续？`
        )
        if (!confirm) {
          return '操作已取消'
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        const result = await api.getItem(
          binding.maiUid,
          itemId,
          itemKind.toString(),
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
        )

        if (result.ItemStatus === false || result.LoginStatus === false || result.LogoutStatus === false) {
          return '❌ 发放失败：服务器未返回成功状态，请稍后再试或点击获取二维码刷新账号后再试。'
        }

        return `✅ 已为 ${maskUserId(binding.maiUid)} 发放收藏品\n类型: ${selectedType?.label}\nID: ${itemId}`
      } catch (error: any) {
        logger.error('发收藏品失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 发放失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 清收藏品
   * 用法: /mai清收藏品
   * @deprecated 清收藏品功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai清收藏品 [targetUserId:text]', '清空收藏品')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 交互式选择收藏品类别
        const itemKind = await promptCollectionType(session)
        if (itemKind === null) {
          return '操作已取消'
        }

        const selectedType = COLLECTION_TYPE_OPTIONS.find(opt => opt.value === itemKind)
        await session.send(
          `已选择：${selectedType?.label} (${itemKind})\n\n` +
          `请输入收藏品ID（数字）\n` +
          `如果不知道收藏品ID，请前往 https://sdgb.lemonno.xyz/ 查询\n` +
          `乐曲解禁请输入乐曲ID\n\n` +
          `输入0取消操作`
        )

        const itemIdInput = await session.prompt(60000)
        if (!itemIdInput || itemIdInput.trim() === '0') {
          return '操作已取消'
        }

        const itemId = itemIdInput.trim()
        // 验证ID是否为数字
        if (!/^\d+$/.test(itemId)) {
          return '❌ ID必须是数字，请重新输入'
        }

        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const confirm = await promptYesLocal(
            session,
            `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的收藏品\n类型: ${selectedType?.label} (${itemKind})\nID: ${itemId}\n确认继续？`
          )
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        const result = await api.clearItem(
          binding.maiUid,
          itemId,
          itemKind.toString(),
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
        )

        if (result.ClearStatus === false || result.LoginStatus === false || result.LogoutStatus === false) {
          return '❌ 清空失败：服务器未返回成功状态，请稍后再试或点击获取二维码刷新账号后再试。'
        }

        return `✅ 已清空 ${maskUserId(binding.maiUid)} 的收藏品\n类型: ${selectedType?.label}\nID: ${itemId}`
      } catch (error: any) {
        logger.error('清收藏品失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 清空失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 上传乐曲成绩
   * 用法: /mai上传乐曲成绩
   * @deprecated 上传乐曲成绩功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai上传乐曲成绩 [targetUserId:text]', '上传游戏乐曲成绩')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 交互式输入乐曲成绩数据
        const scoreData = await promptScoreData(session)
        if (!scoreData) {
          return '操作已取消'
        }

        const levelLabel = LEVEL_OPTIONS.find(opt => opt.value === scoreData.level)?.label || scoreData.level.toString()
        const fcLabel = FC_STATUS_OPTIONS.find(opt => opt.value === scoreData.fcStatus)?.label || scoreData.fcStatus.toString()
        const syncLabel = SYNC_STATUS_OPTIONS.find(opt => opt.value === scoreData.syncStatus)?.label || scoreData.syncStatus.toString()

        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const confirm = await promptYesLocal(
            session,
            `⚠️ 即将为 ${maskUserId(binding.maiUid)} 上传乐曲成绩\n` +
            `乐曲ID: ${scoreData.musicId}\n` +
            `难度等级: ${levelLabel} (${scoreData.level})\n` +
            `达成率: ${scoreData.achievement}\n` +
            `Full Combo: ${fcLabel} (${scoreData.fcStatus})\n` +
            `同步状态: ${syncLabel} (${scoreData.syncStatus})\n` +
            `DX分数: ${scoreData.dxScore}\n` +
            `确认继续？`
          )
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('请求成功提交，请等待服务器响应。（通常需要2-3分钟）')

        const result = await api.uploadScore(
          binding.maiUid,
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
          scoreData.musicId,
          scoreData.level,
          scoreData.achievement,
          scoreData.fcStatus,
          scoreData.syncStatus,
          scoreData.dxScore,
        )

        // 检查4个状态字段是否都是 true
        const loginStatus = result.LoginStatus === true
        const logoutStatus = result.LogoutStatus === true
        const uploadStatus = result.UploadStatus === true
        const userLogStatus = result.UserLogStatus === true

        // 如果4个状态都是 true，则上传成功
        if (loginStatus && logoutStatus && uploadStatus && userLogStatus) {
          return `✅ 已为 ${maskUserId(binding.maiUid)} 上传乐曲成绩\n` +
                 `乐曲ID: ${scoreData.musicId}\n` +
                 `难度: ${levelLabel}`
        }

        // 如果4个状态都是 false，需要重新绑定二维码
        if (
          result.LoginStatus === false &&
          result.LogoutStatus === false &&
          result.UploadStatus === false &&
          result.UserLogStatus === false
        ) {
          await session.send('🔄 二维码已失效，需要重新绑定后才能继续操作')
          const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
          if (rebindResult.success && rebindResult.newBinding) {
            // 重新绑定成功后，尝试再次上传
            try {
              await session.send('⏳ 重新绑定成功，正在重新执行上传操作...')
              const retryResult = await api.uploadScore(
                rebindResult.newBinding.maiUid,
                machineInfo.clientId,
                machineInfo.regionId,
                machineInfo.placeId,
                machineInfo.placeName,
                machineInfo.regionName,
                scoreData.musicId,
                scoreData.level,
                scoreData.achievement,
                scoreData.fcStatus,
                scoreData.syncStatus,
                scoreData.dxScore,
              )
              
              if (
                retryResult.LoginStatus === false &&
                retryResult.LogoutStatus === false &&
                retryResult.UploadStatus === false &&
                retryResult.UserLogStatus === false
              ) {
                await session.send('❌ 重新绑定后上传仍然失败，请检查二维码是否正确')
                return `❌ 重新绑定后上传仍然失败\n错误信息： ${JSON.stringify(retryResult)}`
              }
              
              const retryLoginStatus = retryResult.LoginStatus === true
              const retryLogoutStatus = retryResult.LogoutStatus === true
              const retryUploadStatus = retryResult.UploadStatus === true
              const retryUserLogStatus = retryResult.UserLogStatus === true

              if (retryLoginStatus && retryLogoutStatus && retryUploadStatus && retryUserLogStatus) {
                return `✅ 重新绑定成功！已为 ${maskUserId(rebindResult.newBinding.maiUid)} 上传乐曲成绩\n` +
                       `乐曲ID: ${scoreData.musicId}\n` +
                       `难度: ${levelLabel}`
              }
              
              return `⚠️ 重新绑定成功，但上传部分失败\n错误信息： ${JSON.stringify(retryResult)}`
            } catch (retryError) {
              logger.error('重新绑定后上传失败:', retryError)
              return `✅ 重新绑定成功，但上传操作失败，请稍后重试`
            }
          } else {
            return `❌ 重新绑定失败：${rebindResult.error || '未知错误'}\n请使用 /mai绑定 重新绑定二维码`
          }
        }

        // 其他失败情况，显示详细错误信息
        return `❌ 上传失败\n错误信息： ${JSON.stringify(result)}`
      } catch (error: any) {
        logger.error('上传乐曲成绩失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          const errorInfo = error.response.data ? JSON.stringify(error.response.data) : `${error.response.status} ${error.response.statusText}`
          return `❌ API请求失败\n错误信息： ${errorInfo}\n\n${maintenanceMessage}`
        }
        return `❌ 上传失败\n错误信息： ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 上传落雪B50
   * 用法: /mai上传落雪b50 [lxns_code] [@用户id]
   */
  ctx.command('mai上传落雪b50 [lxnsCode:text] [targetUserId:text]', '上传B50数据到落雪')
    .userFields(['authority'])
    .action(async ({ session }, lxnsCode, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查白名单
      const whitelistCheck = checkWhitelist(session, config)
      if (!whitelistCheck.allowed) {
        return whitelistCheck.message || '本群暂时没有被授权使用本Bot的功能，请添加官方群聊1072033605。'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId

        // 确定使用的落雪代码
        let finalLxnsCode: string
        if (lxnsCode) {
          // 如果提供了参数，使用参数
          // 验证落雪代码长度
          if (lxnsCode.length !== 15) {
            return '❌ 落雪代码长度错误，必须为15个字符'
          }
          finalLxnsCode = lxnsCode
        } else {
          // 如果没有提供参数，使用绑定的代码
          if (!binding.lxnsCode) {
            return '❌ 请先绑定落雪代码或提供落雪代码参数\n使用 /mai绑定落雪 <lxns_code> 进行绑定\n或使用 /mai上传落雪b50 <lxns_code> 直接提供代码'
          }
          finalLxnsCode = binding.lxnsCode
        }

        // 维护时间内直接提示，不发起上传请求
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          return maintenanceMsg
        }

        // 获取qr_text（交互式或从绑定中获取）
        const qrTextResult = await getQrText(session, ctx, api, binding, config, rebindTimeout)
        if (qrTextResult.error) {
          if (qrTextResult.needRebind) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (!rebindResult.success) {
              return `❌ 重新绑定失败：${rebindResult.error || '未知错误'}\n请使用 /mai绑定 重新绑定二维码`
            }
            // 重新绑定成功后，使用新的binding
            const updatedBinding = rebindResult.newBinding || binding
            const retryQrText = await getQrText(session, ctx, api, updatedBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 获取二维码失败：${retryQrText.error}`
            }
            // 使用新的qrText继续
            const result = await api.uploadLxB50(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              retryQrText.qrText,
              finalLxnsCode
            )
            if (!result.UploadStatus) {
              if (result.msg === '该账号下存在未完成的任务') {
                return '⚠️ 当前账号已有未完成的落雪B50任务，请稍后再试，无需重复上传。'
              }
              return `❌ 上传失败：${result.msg || '未知错误'}`
            }
            scheduleLxB50Notification(session, result.task_id)
            return `✅ 落雪B50上传任务已提交！\n任务ID: ${result.task_id}\n\n请耐心等待任务完成，预计1-10分钟`
          }
          return `❌ 获取二维码失败：${qrTextResult.error}`
        }

        // 上传落雪B50（使用新API，需要qr_text）
        let result
        try {
          result = await api.uploadLxB50(
            machineInfo.regionId,
            machineInfo.clientId,
            machineInfo.placeId,
            qrTextResult.qrText,
            finalLxnsCode
          )
        } catch (error: any) {
          // 如果API返回失败，可能需要重新绑定
          const failureResult = await handleApiFailure(session, ctx, api, binding, config, error, rebindTimeout)
          if (failureResult.rebindResult && failureResult.rebindResult.success && failureResult.rebindResult.newBinding) {
            // 重新绑定成功，重试上传
            const retryQrText = await getQrText(session, ctx, api, failureResult.rebindResult.newBinding, config, rebindTimeout)
            if (retryQrText.error) {
              return `❌ 重新绑定后获取二维码失败：${retryQrText.error}`
            }
            result = await api.uploadLxB50(
              machineInfo.regionId,
              machineInfo.clientId,
              machineInfo.placeId,
              retryQrText.qrText,
              finalLxnsCode
            )
          } else {
            throw error
          }
        }

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的落雪B50任务，请耐心等待任务完成，预计1-10分钟，无需重复上传。'
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的落雪B50任务，请耐心等待任务完成，预计1-10分钟，无需重复上传。'
          }
          // 如果返回失败，可能需要重新绑定
          if (result.msg?.includes('二维码') || result.msg?.includes('qr_text') || result.msg?.includes('无效')) {
            const rebindResult = await promptForRebind(session, ctx, api, binding, config, rebindTimeout)
            if (rebindResult.success && rebindResult.newBinding) {
              return `✅ 重新绑定成功！请重新执行上传操作。`
            }
            return `❌ 上传失败：${result.msg || '未知错误'}\n重新绑定失败：${rebindResult.error || '未知错误'}`
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        scheduleLxB50Notification(session, result.task_id)

        return `✅ 落雪B50上传任务已提交！\n任务ID: ${result.task_id}\n\n请耐心等待任务完成，预计1-10分钟`
      } catch (error: any) {
        ctx.logger('maibot').error('上传落雪B50失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        // 处理请求超时类错误，统一提示
        if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
          let msg = '落雪B50任务 上传失败，请稍后再试一次。'
          const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
          if (maintenanceMsg) {
            msg += `\n${maintenanceMsg}`
          }
          msg += `\n\n${maintenanceMessage}`
          return msg
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 上传失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  // 查询落雪B50任务状态功能已暂时取消

  /**
   * 查询选项文件（OPT）
   * 用法: /mai查询opt <title_ver>
   * 权限: auth3
   */
  ctx.command('mai查询opt <titleVer:text>', '查询Mai2选项文件下载地址')
    .userFields(['authority'])
    .action(async ({ session }, titleVer) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查权限（auth3）
      if (session.user?.authority !== 3) {
        return '❌ 权限不足，此功能需要auth等级3'
      }

      if (!titleVer) {
        return '❌ 请提供游戏版本号\n用法：/mai查询opt <title_ver>\n例如：/mai查询opt 1.00'
      }

      try {
        const result = await api.getOpt(titleVer, machineInfo.clientId)

        if (result.error) {
          return `❌ 查询失败：${result.error}`
        }

        let message = `✅ 选项文件查询成功\n\n`
        message += `游戏版本: ${titleVer}\n`
        message += `客户端ID: ${machineInfo.clientId}\n\n`

        if (result.app_url && result.app_url.length > 0) {
          message += `📦 APP文件 (${result.app_url.length}个):\n`
          result.app_url.forEach((url, index) => {
            message += `${index + 1}. ${url}\n`
          })
          message += `\n`
        } else {
          message += `📦 APP文件: 无\n\n`
        }

        if (result.opt_url && result.opt_url.length > 0) {
          message += `📦 OPT文件 (${result.opt_url.length}个):\n`
          result.opt_url.forEach((url, index) => {
            message += `${index + 1}. ${url}\n`
          })
          message += `\n`
        } else {
          message += `📦 OPT文件: 无\n\n`
        }

        if (result.latest_app_time) {
          message += `最新APP发布时间: ${result.latest_app_time}\n`
        }
        if (result.latest_opt_time) {
          message += `最新OPT发布时间: ${result.latest_opt_time}\n`
        }

        return message
      } catch (error: any) {
        logger.error('查询OPT失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}\n\n${maintenanceMessage}`
        }
        return `❌ 查询失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  // 提醒功能配置
  const alertMessages = config.alertMessages || {
    loginMessage: '{playerid}{at} 你的账号已上线。',
    logoutMessage: '{playerid}{at} 你的账号已下线。',
  }
  const checkInterval = config.alertCheckInterval ?? 60000  // 默认60秒
  const concurrency = config.alertConcurrency ?? 3  // 默认并发3个
  const lockRefreshDelay = config.lockRefreshDelay ?? 1000  // 默认1秒延迟
  const lockRefreshConcurrency = config.lockRefreshConcurrency ?? 3  // 默认并发3个

  /**
   * 检查单个用户的登录状态
   */
  const checkUserStatus = async (binding: UserBinding) => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      // logger.debug('插件已停止，跳过检查用户状态')  // 隐藏日志
      return
    }

    try {
      // 在执行 preview 前，再次检查账号是否仍然启用播报且未被锁定（可能在并发执行过程中被修改了）
      const currentBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
      if (currentBinding.length === 0) {
        // logger.debug(`用户 ${binding.userId} 绑定记录已删除，跳过检查`)  // 隐藏日志
        return
      }
      
      const current = currentBinding[0]
      if (!current.alertEnabled || current.isLocked) {
        // logger.debug(`用户 ${binding.userId} 播报已关闭或账号已锁定，跳过检查 (alertEnabled: ${current.alertEnabled}, isLocked: ${current.isLocked})`)  // 隐藏日志
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        // logger.debug('插件已停止，取消预览请求')  // 隐藏日志
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        // logger.debug('插件已停止，取消预览请求')  // 隐藏日志
        return
      }

      // logger.debug(`检查用户 ${binding.userId} (maiUid: ${maskUserId(binding.maiUid)}) 的状态`)  // 隐藏日志
      
      // 从数据库读取上一次保存的状态（用于比较）
      const lastSavedStatus = current.lastLoginStatus
      // logger.debug(`用户 ${binding.userId} 数据库中保存的上一次状态: ${lastSavedStatus} (类型: ${typeof lastSavedStatus})`)  // 隐藏日志
      
      // 获取当前登录状态
      // 废弃旧的uid策略，后台任务无法交互式获取二维码，跳过检查
      // 注意：由于废弃了uid策略，后台状态检查功能已禁用
      // logger.warn(`用户 ${binding.userId} 状态检查：由于废弃uid策略，后台任务无法获取新二维码，跳过检查`)  // 隐藏日志
      return
    } catch (error) {
      logger.error(`检查用户 ${binding.userId} 状态失败:`, error)
    }
  }

  /**
   * 并发处理函数：将数组分批并发处理
   */
  const processBatch = async <T>(items: T[], concurrency: number, processor: (item: T) => Promise<void>) => {
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency)
      await Promise.all(batch.map(processor))
    }
  }

  /**
   * 账号状态提醒功能
   * 使用配置的间隔和并发数检查所有启用播报的用户状态
   */
  const checkLoginStatus = async () => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      // logger.debug('插件已停止，取消检查登录状态任务')  // 隐藏日志
      return
    }

    // 检查登录播报功能是否被管理员关闭
    if (!alertFeatureEnabled) {
      // logger.debug('登录播报功能已被管理员关闭，跳过检查')  // 隐藏日志
      return
    }

    // logger.debug('开始检查登录状态...')  // 隐藏日志，减少刷屏
    try {
      // 获取所有绑定记录
      const allBindings = await ctx.database.get('maibot_bindings', {})
      // logger.debug(`总共有 ${allBindings.length} 个绑定记录`)  // 隐藏日志
      
      // 过滤出启用播报的用户（alertEnabled 为 true），但排除已锁定的账号
      const bindings = allBindings.filter(b => {
        const enabled = b.alertEnabled === true
        const isLocked = b.isLocked === true
        // 隐藏详细的用户状态日志
        // if (enabled && !isLocked) {
        //   logger.debug(`用户 ${b.userId} 启用了播报 (alertEnabled: ${b.alertEnabled}, guildId: ${b.guildId}, channelId: ${b.channelId})`)
        // } else if (enabled && isLocked) {
        //   logger.debug(`用户 ${b.userId} 启用了播报但账号已锁定，跳过推送`)
        // }
        return enabled && !isLocked
      })
      // logger.info(`启用播报的用户数量: ${bindings.length}`)  // 隐藏日志
      
      // if (bindings.length > 0) {
      //   logger.debug(`启用播报的用户列表: ${bindings.map(b => `${b.userId}(${maskUserId(b.maiUid)})`).join(', ')}`)
      // }
      
      if (bindings.length === 0) {
        // logger.debug('没有启用播报的用户，跳过检查')  // 隐藏日志
        return
      }

      // 使用并发处理
      // logger.debug(`使用并发数 ${concurrency} 检查 ${bindings.length} 个用户`)  // 隐藏日志
      await processBatch(bindings, concurrency, checkUserStatus)
      
    } catch (error) {
      logger.error('检查登录状态失败:', error)
    }
    // logger.debug('登录状态检查完成')  // 隐藏日志，减少刷屏
  }

  // 启动定时任务，使用配置的间隔
  logger.info(`账号状态提醒功能已启动，检查间隔: ${checkInterval}ms (${checkInterval / 1000}秒)，并发数: ${concurrency}`)
  ctx.setInterval(checkLoginStatus, checkInterval)
  
  // 立即执行一次检查（用于调试和初始化）
  ctx.setTimeout(() => {
    logger.info('执行首次登录状态检查...')
    checkLoginStatus()
  }, 5000) // 5秒后执行首次检查

  /**
   * 刷新单个锁定账号的登录状态
   * @deprecated 锁定功能已在新API中移除，已注释
   */
  /*
  const refreshSingleLockedAccount = async (binding: UserBinding) => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      logger.debug('插件已停止，跳过刷新登录状态')
      return
    }

    try {
      // 在执行 login 前，再次检查账号是否仍然被锁定（可能在并发执行过程中被解锁了）
      const currentBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
      if (currentBinding.length === 0 || !currentBinding[0].isLocked) {
        logger.debug(`用户 ${binding.userId} 账号已解锁，跳过刷新登录状态`)
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        logger.debug('插件已停止，取消登录请求')
        return
      }

      logger.debug(`刷新用户 ${binding.userId} (maiUid: ${maskUserId(binding.maiUid)}) 的登录状态`)
      
      // 重新执行登录
      const result = await api.login(
        binding.maiUid,
        machineInfo.regionId,
        machineInfo.placeId,
        machineInfo.clientId,
        turnstileToken,
      )
      
      if (result.LoginStatus) {
        // 更新LoginId（如果有变化）
        if (result.LoginId && result.LoginId !== binding.lockLoginId) {
          await ctx.database.set('maibot_bindings', { userId: binding.userId }, {
            lockLoginId: result.LoginId,
          })
          logger.info(`用户 ${binding.userId} 登录状态已刷新，LoginId: ${result.LoginId}`)
        } else {
          logger.debug(`用户 ${binding.userId} 登录状态已刷新`)
        }
      } else {
        if (result.UserID === -2) {
          logger.error(`用户 ${binding.userId} 刷新登录失败：Turnstile校验失败`)
        } else {
          logger.error(`用户 ${binding.userId} 刷新登录失败：服务端未返回成功状态`)
        }
      }
    } catch (error) {
      logger.error(`刷新用户 ${binding.userId} 登录状态失败:`, error)
    }
  }

  /**
   * 保持锁定账号的登录状态
   * 使用并发处理和延迟对锁定的用户重新执行login
   * @deprecated 锁定功能已在新API中移除，已注释
   */
  /*
  const refreshLockedAccounts = async () => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      logger.debug('插件已停止，取消刷新锁定账号任务')
      return
    }

    logger.debug('开始刷新锁定账号的登录状态...')
    try {
      // 获取所有锁定的账号
      const lockedBindings = await ctx.database.get('maibot_bindings', {
        isLocked: true,
      })
      
      logger.info(`找到 ${lockedBindings.length} 个锁定的账号，开始刷新登录状态（并发数: ${lockRefreshConcurrency}，延迟: ${lockRefreshDelay}ms）`)
      
      if (lockedBindings.length === 0) {
        logger.debug('没有锁定的账号需要刷新')
        return
      }

      // 使用并发处理，批次之间添加延迟
      // refreshSingleLockedAccount 内部会检查账号是否仍然被锁定，所以这里直接处理即可
      for (let i = 0; i < lockedBindings.length; i += lockRefreshConcurrency) {
        // 在每批处理前检查插件状态
        if (!isPluginActive) {
          logger.debug('插件已停止，中断刷新锁定账号任务')
          break
        }

        const batch = lockedBindings.slice(i, i + lockRefreshConcurrency)
        // 并发处理当前批次（每个任务内部会检查账号是否仍然被锁定）
        await Promise.all(batch.map(refreshSingleLockedAccount))
        
        // 如果不是最后一批，添加延迟（延迟前再次检查插件状态）
        if (i + lockRefreshConcurrency < lockedBindings.length) {
          if (!isPluginActive) {
            logger.debug('插件已停止，中断刷新锁定账号任务')
            break
          }
          await new Promise(resolve => setTimeout(resolve, lockRefreshDelay))
        }
      }
    } catch (error) {
      logger.error('刷新锁定账号登录状态失败:', error)
    }
    // logger.debug('锁定账号登录状态刷新完成')  // 隐藏日志
  }

  // 启动锁定账号刷新任务，每1分钟执行一次
  const lockRefreshInterval = 60 * 1000  // 1分钟
  logger.info(`锁定账号刷新功能已启动，每1分钟刷新一次`)
  ctx.setInterval(refreshLockedAccounts, lockRefreshInterval)
  
  // 立即执行一次刷新（延迟30秒，避免与首次检查冲突）
  ctx.setTimeout(() => {
    logger.info('执行首次锁定账号刷新...')
    refreshLockedAccounts()
  }, 30000) // 30秒后执行首次刷新
  */

  /**
   * 保护模式：自动锁定单个账号（当检测到下线时）
   * @deprecated 保护模式功能已在新API中移除，已注释
   */
  /*
  const autoLockAccount = async (binding: UserBinding) => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      logger.debug('插件已停止，跳过自动锁定检查')
      return
    }

    try {
      // 再次检查账号是否仍在保护模式下且未锁定
      const currentBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
      if (currentBinding.length === 0 || !currentBinding[0].protectionMode || currentBinding[0].isLocked) {
        logger.debug(`用户 ${binding.userId} 保护模式已关闭或账号已锁定，跳过自动锁定检查`)
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        logger.debug('插件已停止，取消预览请求')
        return
      }

      logger.debug(`保护模式：检查用户 ${binding.userId} (maiUid: ${maskUserId(binding.maiUid)}) 的登录状态`)
      
      // 获取当前登录状态
      // 废弃旧的uid策略，后台任务无法交互式获取二维码，跳过检查
      // 注意：由于废弃了uid策略，后台保护模式检查功能已禁用
      logger.warn(`用户 ${binding.userId} 保护模式检查：由于废弃uid策略，后台任务无法获取新二维码，跳过检查`)
      return
    } catch (error) {
      logger.error(`保护模式检查用户 ${binding.userId} 状态失败:`, error)
    }
  }

  /**
   * 锁定账号刷新功能（后台任务）
   */
  const refreshLockedAccounts = async () => {
    // 查找所有已锁定的账号
    // ... (删除所有后续代码，因为保护模式功能已禁用)
    return
  }

  // 启动定时任务（已禁用，因为废弃了uid策略）
  // ctx.setInterval(refreshLockedAccounts, lockRefreshInterval)
  
  // 禁用保护模式定时检查（已禁用，因为废弃了uid策略）
  // ctx.setInterval(checkProtectionMode, protectionCheckInterval)

  // 以下代码已删除，因为废弃了uid策略导致后台任务无法获取新二维码
  /*
      // 如果账号已下线，尝试自动锁定
      if (!currentLoginStatus) {
        logger.info(`保护模式：检测到用户 ${binding.userId} 账号已下线，尝试自动锁定`)
        
        // 再次确认账号状态和插件状态
        const verifyBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
        if (verifyBinding.length === 0 || !verifyBinding[0].protectionMode || verifyBinding[0].isLocked) {
          logger.debug(`用户 ${binding.userId} 保护模式已关闭或账号已锁定，取消自动锁定`)
          return
        }

        if (!isPluginActive) {
          logger.debug('插件已停止，取消自动锁定请求')
          return
        }

        // 执行锁定
        const result = await api.login(
          binding.maiUid,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.clientId,
          turnstileToken,
        )

        if (result.LoginStatus) {
          // 锁定成功，更新数据库
          await ctx.database.set('maibot_bindings', { userId: binding.userId }, {
            isLocked: true,
            lockTime: new Date(),
            lockLoginId: result.LoginId,
          })
          logger.info(`保护模式：用户 ${binding.userId} 账号已自动锁定成功，LoginId: ${result.LoginId}`)
          
          // 发送@用户通知
          const finalBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
          if (finalBinding.length > 0 && finalBinding[0].guildId && finalBinding[0].channelId) {
            try {
              // 获取玩家名
              // 获取玩家名
              const playerName = preview.UserName || binding.userName || '玩家'
              const mention = `<at id="${binding.userId}"/>`
              // 使用配置的消息模板
              const message = protectionLockMessage
                .replace(/{playerid}/g, playerName)
                .replace(/{at}/g, mention)
              
              // 尝试使用第一个可用的bot发送消息
              let sent = false
              for (const bot of ctx.bots) {
                try {
                  await bot.sendMessage(finalBinding[0].channelId, message, finalBinding[0].guildId)
                  logger.info(`✅ 已发送保护模式锁定成功通知给用户 ${binding.userId} (${playerName})`)
                  sent = true
                  break // 成功发送后退出循环
                } catch (error) {
                  logger.warn(`bot ${bot.selfId} 发送保护模式通知失败:`, error)
                  continue
                }
              }
              
              if (!sent) {
                logger.error(`❌ 所有bot都无法发送保护模式通知给用户 ${binding.userId}`)
              }
            } catch (error) {
              logger.error(`发送保护模式通知失败:`, error)
            }
          }
        } else {
          logger.warn(`保护模式：用户 ${binding.userId} 自动锁定失败，将在下次检查时重试`)
          if (result.UserID === -2) {
            logger.error(`保护模式：用户 ${binding.userId} 自动锁定失败：Turnstile校验失败`)
          }
        }
      } else {
        logger.debug(`保护模式：用户 ${binding.userId} 账号仍在线上，无需锁定`)
      }
    } catch (error) {
      logger.error(`保护模式：检查用户 ${binding.userId} 状态失败:`, error)
    }
  }

  /**
   * 保护模式：检查所有启用保护模式的账号，自动锁定已下线的账号
   * @deprecated 保护模式功能已在新API中移除，已注释
   */
  /*
  const checkProtectionMode = async () => {
    // 检查插件是否还在运行
    if (!isPluginActive) {
      logger.debug('插件已停止，取消保护模式检查任务')
      return
    }

    logger.debug('开始检查保护模式账号...')
    try {
      // 获取所有启用保护模式且未锁定的账号
      const allBindings = await ctx.database.get('maibot_bindings', {})
      logger.debug(`总共有 ${allBindings.length} 个绑定记录`)

      // 过滤出启用保护模式且未锁定的账号
      const bindings = allBindings.filter(b => {
        return b.protectionMode === true && b.isLocked !== true
      })
      
      logger.debug(`启用保护模式的账号数量: ${bindings.length}`)
      
      if (bindings.length > 0) {
        logger.debug(`启用保护模式的账号列表: ${bindings.map(b => `${b.userId}(${maskUserId(b.maiUid)})`).join(', ')}`)
      }
      
      if (bindings.length === 0) {
        logger.debug('没有启用保护模式的账号，跳过检查')
        return
      }

      // 使用并发处理
      logger.debug(`使用并发数 ${concurrency} 检查 ${bindings.length} 个保护模式账号`)
      await processBatch(bindings, concurrency, autoLockAccount)
      
    } catch (error) {
      logger.error('检查保护模式账号失败:', error)
    }
    // logger.debug('保护模式检查完成')  // 隐藏日志
  }

  // 启动保护模式检查定时任务，使用配置的间隔
  const protectionCheckInterval = config.protectionCheckInterval ?? 60000  // 默认60秒
  logger.info(`账号保护模式检查功能已启动，检查间隔: ${protectionCheckInterval}ms (${protectionCheckInterval / 1000}秒)，并发数: ${concurrency}`)
  ctx.setInterval(checkProtectionMode, protectionCheckInterval)
  
  // 立即执行一次检查（延迟35秒，避免与其他检查冲突）
  ctx.setTimeout(() => {
    logger.info('执行首次保护模式检查...')
    checkProtectionMode()
  }, 35000) // 35秒后执行首次检查

  /**
   * 开关播报功能
   * 用法: /maialert [on|off]
   */
  ctx.command('maialert [state:text]', '开关账号状态播报功能')
    .action(async ({ session }, state) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId

      try {
        // 检查是否已绑定账号
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        const currentState = binding.alertEnabled ?? false

        // 如果没有提供参数，显示当前状态
        if (!state) {
          return `当前播报状态: ${currentState ? '✅ 已开启' : '❌ 已关闭'}\n\n使用 /maialert on 开启\n使用 /maialert off 关闭`
        }

        const newState = state.toLowerCase() === 'on' || state.toLowerCase() === 'true' || state === '1'

        // 如果状态没有变化
        if (currentState === newState) {
          return `播报状态已经是 ${newState ? '开启' : '关闭'} 状态`
        }

        // 更新状态，同时保存群组和频道信息
        const guildId = session.guildId || binding.guildId
        const channelId = session.channelId || binding.channelId
        
        logger.info(`用户 ${userId} ${newState ? '开启' : '关闭'}播报功能，guildId: ${guildId}, channelId: ${channelId}`)
        
        const updateData: any = {
          alertEnabled: newState,
        }
        
        if (guildId) {
          updateData.guildId = guildId
        }
        if (channelId) {
          updateData.channelId = channelId
        }
        
        await ctx.database.set('maibot_bindings', { userId }, updateData)

        // 如果是首次开启，初始化登录状态
        // 废弃旧的uid策略，无法使用缓存的qrCode或maiUid初始化状态
        if (newState && binding.lastLoginStatus === undefined) {
          logger.warn(`用户 ${userId} 状态初始化：由于废弃uid策略，无法使用缓存的qrCode或maiUid初始化状态，跳过初始化`)
          // 设置为undefined，等待用户下次使用指令时通过新二维码获取状态
        }

        let resultMessage = `✅ 播报功能已${newState ? '开启' : '关闭'}`
        if (newState) {
          if (!guildId || !channelId) {
            resultMessage += `\n⚠️ 警告：当前会话缺少群组信息，提醒可能无法发送。请在群内使用此命令。`
          } else {
            resultMessage += `\n当账号登录状态发生变化时，会在群内提醒你。`
          }
        } else {
          resultMessage += `\n已停止播报账号状态变化。`
        }
        
        return resultMessage
      } catch (error: any) {
        logger.error('开关播报功能失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 操作失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 管理员开关他人的播报状态
   * 用法: /maialert set <userId> [on|off]
   */
  ctx.command('maialert set <targetUserId:text> [state:text]', '设置他人的播报状态（需要auth等级3以上）')
    .userFields(['authority'])
    .action(async ({ session }, targetUserId, state) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查权限
      if ((session.user?.authority ?? 0) < 3) {
        return '❌ 权限不足，需要auth等级3以上才能设置他人的播报状态'
      }

      if (!targetUserId) {
        return '请提供目标用户ID\n用法：/maialert set <userId> [on|off]'
      }

      if (!state) {
        return '请提供状态\n用法：/maialert set <userId> on 或 /maialert set <userId> off'
      }

      try {
        // 检查目标用户是否已绑定账号
        const bindings = await ctx.database.get('maibot_bindings', { userId: targetUserId })
        
        if (bindings.length === 0) {
          return `❌ 用户 ${targetUserId} 尚未绑定账号`
        }

        const binding = bindings[0]
        const newState = state.toLowerCase() === 'on' || state.toLowerCase() === 'true' || state === '1'
        
        const guildId = session.guildId || binding.guildId
        const channelId = session.channelId || binding.channelId
        
        logger.info(`管理员 ${session.userId} ${newState ? '开启' : '关闭'}用户 ${targetUserId} 的播报功能，guildId: ${guildId}, channelId: ${channelId}`)

        // 更新状态
        const updateData: any = {
          alertEnabled: newState,
        }
        
        if (guildId) {
          updateData.guildId = guildId
        }
        if (channelId) {
          updateData.channelId = channelId
        }
        
        await ctx.database.set('maibot_bindings', { userId: targetUserId }, updateData)

        // 如果是首次开启，初始化登录状态
        // 废弃旧的uid策略，无法使用缓存的qrCode初始化状态
        if (newState && binding.lastLoginStatus === undefined) {
          logger.warn(`用户 ${targetUserId} 状态初始化：由于废弃uid策略，无法使用缓存的qrCode初始化状态，跳过初始化`)
          // 设置为undefined，等待用户下次使用指令时通过新二维码获取状态
        }

        let resultMessage = `✅ 已${newState ? '开启' : '关闭'}用户 ${targetUserId} 的播报功能`
        if (newState && (!guildId || !channelId)) {
          resultMessage += `\n⚠️ 警告：当前会话缺少群组信息，提醒可能无法发送。`
        }
        
        return resultMessage
      } catch (error: any) {
        logger.error('设置他人播报状态失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 操作失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 开关账号保护模式
   * 用法: /mai保护模式 [on|off]
   * @deprecated 保护模式功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai保护模式 [state:text] [targetUserId:text]', '开关账号保护模式（自动锁定已下线的账号）')
    .userFields(['authority'])
    .action(async ({ session }, state, targetUserId) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查隐藏模式
      if (hideLockAndProtection) {
        return '❌ 该功能已禁用'
      }

      try {
        // 获取目标用户绑定
        const { binding, isProxy, error } = await getTargetBinding(session, targetUserId)
        if (error || !binding) {
          return error || '❌ 获取用户绑定失败'
        }

        const userId = binding.userId
        const currentState = binding.protectionMode ?? false

        // 如果没有提供参数，显示当前状态
        if (!state) {
          return `当前保护模式状态: ${currentState ? '✅ 已开启' : '❌ 已关闭'}\n\n使用 /mai保护模式 on 开启\n使用 /mai保护模式 off 关闭\n\n开启后会自动锁定账号，如果锁定失败会在账号下线时自动尝试锁定`
        }

        const newState = state.toLowerCase() === 'on' || state.toLowerCase() === 'true' || state === '1'

        // 如果状态没有变化
        if (currentState === newState) {
          return `保护模式已经是 ${newState ? '开启' : '关闭'} 状态`
        }

        logger.info(`用户 ${userId} ${newState ? '开启' : '关闭'}保护模式`)

        if (newState) {
          // 开启保护模式：尝试立即锁定账号
          if (binding.isLocked) {
            // 如果已经锁定，直接开启保护模式
            await ctx.database.set('maibot_bindings', { userId }, {
              protectionMode: true,
            })
            return `✅ 保护模式已开启\n账号当前已锁定，保护模式将在账号解锁后生效`
          }

          // 尝试锁定账号
          await session.send('⏳ 正在尝试锁定账号，请稍候...')

          const result = await api.login(
            binding.maiUid,
            machineInfo.regionId,
            machineInfo.placeId,
            machineInfo.clientId,
            turnstileToken,
          )

          const updateData: any = {
            protectionMode: true,
          }

          if (result.LoginStatus) {
            // 锁定成功
            updateData.isLocked = true
            updateData.lockTime = new Date()
            updateData.lockLoginId = result.LoginId
            
            // 如果之前开启了推送，锁定时自动关闭
            if (binding.alertEnabled === true) {
              updateData.alertEnabled = false
              logger.info(`用户 ${userId} 保护模式锁定账号，已自动关闭 maialert 推送`)
            }

            await ctx.database.set('maibot_bindings', { userId }, updateData)

            return `✅ 保护模式已开启\n账号已成功锁定，将保持登录状态防止他人登录`
          } else {
            // 锁定失败，但仍开启保护模式，系统会在账号下线时自动尝试锁定
            await ctx.database.set('maibot_bindings', { userId }, updateData)

            let message = `✅ 保护模式已开启\n⚠️ 当前无法锁定账号（可能账号正在被使用或者挂哥上号）\n系统将定期检查账号状态，当检测到账号下线时会自动尝试锁定，防止一直小黑屋！\n`
            
            if (result.UserID === -2) {
              message += `\n错误信息：Turnstile校验失败`
            } else {
              message += `\n错误信息：服务端未返回成功状态`
            }

            return message
          }
        } else {
          // 关闭保护模式
          await ctx.database.set('maibot_bindings', { userId }, {
            protectionMode: false,
          })
          return `✅ 保护模式已关闭\n已停止自动锁定功能`
        }
      } catch (error: any) {
        logger.error('开关保护模式失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 操作失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })
  */

  /**
   * 管理员一键关闭所有人的锁定模式和保护模式
   * 用法: /mai管理员关闭所有锁定和保护
   * @deprecated 锁定和保护模式功能已在新API中移除，已注释
   */
  /*
  ctx.command('mai管理员关闭所有锁定和保护', '管理员一键关闭所有人的锁定模式和保护模式（需要auth等级3以上）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      // 检查权限
      if ((session.user?.authority ?? 0) < 3) {
        return '❌ 权限不足，需要auth等级3以上才能执行此操作'
      }

      try {
        // 确认操作（如果未使用 -bypass）
        if (!options?.bypass) {
          const confirm = await promptYesLocal(
            session,
            '⚠️ 即将关闭所有用户的锁定模式和保护模式\n此操作将影响所有已绑定账号的用户\n确认继续？'
          )
          if (!confirm) {
            return '操作已取消'
          }
        }

        await session.send('⏳ 正在处理，请稍候...')

        // 获取所有绑定记录
        const allBindings = await ctx.database.get('maibot_bindings', {})
        
        // 统计需要更新的用户数量
        let lockedCount = 0
        let protectionCount = 0
        let totalUpdated = 0

        // 遍历所有绑定记录，更新锁定模式和保护模式
        for (const binding of allBindings) {
          const updateData: any = {}
          let needsUpdate = false

          // 如果用户开启了锁定模式，关闭它
          if (binding.isLocked === true) {
            updateData.isLocked = false
            updateData.lockTime = null
            updateData.lockLoginId = null
            lockedCount++
            needsUpdate = true
          }

          // 如果用户开启了保护模式，关闭它
          if (binding.protectionMode === true) {
            updateData.protectionMode = false
            protectionCount++
            needsUpdate = true
          }

          // 如果有需要更新的字段，执行更新
          if (needsUpdate) {
            await ctx.database.set('maibot_bindings', { userId: binding.userId }, updateData)
            totalUpdated++
          }
        }

        logger.info(`管理员 ${session.userId} 执行了一键关闭操作，更新了 ${totalUpdated} 个用户（锁定: ${lockedCount}，保护模式: ${protectionCount}）`)

        let resultMessage = `✅ 操作完成\n\n`
        resultMessage += `已更新用户数: ${totalUpdated}\n`
        resultMessage += `关闭锁定模式: ${lockedCount} 个用户\n`
        resultMessage += `关闭保护模式: ${protectionCount} 个用户`

        if (totalUpdated === 0) {
          resultMessage = `ℹ️ 没有需要更新的用户\n所有用户都未开启锁定模式和保护模式`
        }

        return resultMessage
      } catch (error: any) {
        logger.error('管理员一键关闭操作失败:', error)
        if (maintenanceMode) {
          return maintenanceMessage
        }
        return `❌ 操作失败: ${error?.message || '未知错误'}\n\n${maintenanceMessage}`
      }
    })

  /**
   * 管理员关闭/开启登录播报功能（全局开关）
   * 用法: /mai管理员关闭登录播报 [on|off]
   */
  ctx.command('mai管理员关闭登录播报 [state:text]', '关闭/开启登录播报功能（需要auth等级3以上）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }, state) => {
      if (!session) return '❌ 无法获取会话信息'
      if ((session.user?.authority ?? 0) < 3) {
        return '❌ 权限不足，需要auth等级3以上才能执行此操作'
      }

      const current = alertFeatureEnabled
      if (!state) {
        return `当前登录播报全局状态: ${current ? '✅ 开启' : '❌ 关闭'}\n\n用法：/mai管理员关闭登录播报 on（开启）\n用法：/mai管理员关闭登录播报 off（关闭）`
      }

      const s = state.trim().toLowerCase()
      const next = (s === 'on' || s === 'true' || s === '1') ? true
        : (s === 'off' || s === 'false' || s === '0') ? false
        : null

      if (next === null) {
        return '参数错误：只能是 on/off\n用法：/mai管理员关闭登录播报 on 或 /mai管理员关闭登录播报 off'
      }

      if (next === current) {
        return `登录播报全局状态已经是 ${next ? '开启' : '关闭'}`
      }

      // 关闭时：默认强制关闭所有人的 maialert 状态，避免仍在开启但不会推送造成困惑
      if (!next) {
        if (!options?.bypass) {
          const confirm = await promptYesLocal(
            session,
            '⚠️ 即将关闭【登录播报全局功能】并强制关闭所有人的 maialert 状态\n确认继续？'
          )
          if (!confirm) return '操作已取消'
        }

        await session.send('⏳ 正在关闭登录播报并强制关闭所有播报，请稍候...')

        const allBindings = await ctx.database.get('maibot_bindings', {})
        let updated = 0
        for (const b of allBindings) {
          if (b.alertEnabled === true) {
            await ctx.database.set('maibot_bindings', { userId: b.userId }, { alertEnabled: false })
            updated++
          }
        }

        await saveAlertFeatureEnabled(false)
        logger.info(`管理员 ${session.userId} 关闭登录播报全局功能，并强制关闭了 ${updated} 个用户的 maialert`)
        return `✅ 登录播报全局功能已关闭\n已强制关闭 maialert 的用户数: ${updated}`
      }

      // 开启时：只恢复全局开关，不自动开启任何人的 maialert
      await saveAlertFeatureEnabled(true)
      logger.info(`管理员 ${session.userId} 开启登录播报全局功能`)
      return '✅ 登录播报全局功能已开启（不会自动开启任何人的 maialert）'
    })

  /**
   * 管理员强制关闭所有人的 maialert 状态
   * 用法: /mai管理员关闭所有播报
   */
  ctx.command('mai管理员关闭所有播报', '强制关闭所有人的maialert状态（需要auth等级3以上）')
    .userFields(['authority'])
    .option('bypass', '-bypass  绕过确认')
    .action(async ({ session, options }) => {
      if (!session) return '❌ 无法获取会话信息'
      if ((session.user?.authority ?? 0) < 3) {
        return '❌ 权限不足，需要auth等级3以上才能执行此操作'
      }

      if (!options?.bypass) {
        const confirm = await promptYesLocal(
          session,
          '⚠️ 即将强制关闭所有人的 maialert 状态（仅影响播报开关，不影响绑定/锁定/保护模式）\n确认继续？'
        )
        if (!confirm) return '操作已取消'
      }

      await session.send('⏳ 正在强制关闭所有播报，请稍候...')
      const allBindings = await ctx.database.get('maibot_bindings', {})
      let updated = 0
      for (const b of allBindings) {
        if (b.alertEnabled === true) {
          await ctx.database.set('maibot_bindings', { userId: b.userId }, { alertEnabled: false })
          updated++
        }
      }

      logger.info(`管理员 ${session.userId} 强制关闭所有播报，关闭了 ${updated} 个用户的 maialert`)
      return updated === 0
        ? 'ℹ️ 没有需要关闭的用户（所有人的 maialert 都已是关闭状态）'
        : `✅ 已强制关闭所有人的 maialert\n关闭的用户数: ${updated}`
    })
}

