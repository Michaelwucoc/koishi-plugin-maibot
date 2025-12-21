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
})

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

export function apply(ctx: Context, config: Config) {
  // 扩展数据库
  extendDatabase(ctx)

  // 初始化API客户端
  const api = new MaiBotAPI({
    baseURL: config.apiBaseURL,
    timeout: config.apiTimeout,
  })
  const logger = ctx.logger('maibot')

  // 插件运行状态标志，用于在插件停止后阻止新的请求
  let isPluginActive = true
  ctx.on('dispose', () => {
    isPluginActive = false
    logger.info('插件已停止，将不再执行新的定时任务')
  })

  // 使用配置中的值
  const machineInfo = config.machineInfo
  const turnstileToken = config.turnstileToken
  const maintenanceNotice = config.maintenanceNotice
  const confirmTimeout = config.confirmTimeout ?? 10000

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

  const scheduleB50Notification = (session: Session, taskId: string) => {
    const bot = session.bot
    const channelId = session.channelId
    if (!bot || !channelId) {
      logger.warn('无法追踪B50任务完成状态：bot或channel信息缺失')
      return
    }

    const mention = buildMention(session)
    const guildId = session.guildId
    const maxAttempts = 20
    const interval = 1_000  // 减少到5秒轮询一次，更快响应
    const initialDelay = 2_000  // 首次延迟3秒后开始检查
    let attempts = 0

    const poll = async () => {
      attempts += 1
      try {
        const detail = await api.getB50TaskById(taskId)
        if (!detail.done && attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }

        if (detail.done) {
          const statusText = detail.error
            ? `❌ 任务失败：${detail.error}`
            : '✅ 任务已完成'
          const finishTime = detail.alive_task_end_time
            ? `\n完成时间: ${new Date(parseInt(detail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}`
            : ''
          await bot.sendMessage(
            channelId,
            `${mention} 水鱼B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`,
            guildId,
          )
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
    const maxAttempts = 20
    const interval = 1_000  // 1秒轮询一次，更快响应
    const initialDelay = 2_000  // 首次延迟2秒后开始检查
    let attempts = 0

    const poll = async () => {
      attempts += 1
      try {
        const detail = await api.getLxB50TaskById(taskId)
        if (!detail.done && attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }

        if (detail.done) {
          const statusText = detail.error
            ? `❌ 任务失败：${detail.error}`
            : '✅ 任务已完成'
          const finishTime = detail.alive_task_end_time
            ? `\n完成时间: ${new Date(parseInt(detail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}`
            : ''
          await bot.sendMessage(
            channelId,
            `${mention} 落雪B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`,
            guildId,
          )
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
   * 绑定用户
   * 用法: /mai绑定 <SGWCMAID...>
   */
  ctx.command('mai绑定 <qrCode:text>', '绑定舞萌DX账号')
    .action(async ({ session }, qrCode) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      if (!qrCode) {
        return '请提供二维码文本（SGWCMAID开头）\n用法：/mai绑定 SGWCMAIDxxxxxxxxxxxxx'
      }

      // 验证二维码格式
      if (!qrCode.startsWith('SGWCMAID')) {
        return '❌ 二维码格式错误，必须以 SGWCMAID 开头'
      }

      if (qrCode.length < 48 || qrCode.length > 128) {
        return '❌ 二维码长度错误，应在48-128字符之间'
      }

      const userId = session.userId

      try {
        // 检查是否已绑定
        const existing = await ctx.database.get('maibot_bindings', { userId })
        if (existing.length > 0) {
          return `❌ 您已经绑定了账号\n用户ID: ${maskUserId(existing[0].maiUid)}\n绑定时间: ${new Date(existing[0].bindTime).toLocaleString('zh-CN')}\n\n如需重新绑定，请先使用 /mai解绑`
        }

        // 调用API获取用户ID
        const result = await api.qr2userid(qrCode)

        if (!result.QRStatus) {
          return `❌ 绑定失败：无法从二维码获取用户ID\n错误信息: ${result.UserID === 'MTI1MTEy' ? '无效或过期的二维码' : result.UserID}`
        }

        const maiUid = result.UserID

        // 获取用户详细信息（可选）
        let userName: string | undefined
        let rating: string | undefined
        try {
          const preview = await api.preview(maiUid)
          userName = preview.UserName
          rating = preview.Rating
        } catch (error) {
          // 如果获取预览失败，不影响绑定
          ctx.logger('maibot').warn('获取用户预览信息失败:', error)
        }

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
               `用户ID: ${maskUserId(maiUid)}\n` +
               (userName ? `用户名: ${userName}\n` : '') +
               (rating ? `Rating: ${rating}\n` : '') +
               `绑定时间: ${new Date().toLocaleString('zh-CN')}`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定失败:', error)
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 绑定失败: ${error?.message || '未知错误'}`
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

      const userId = session.userId

      try {
        // 查找绑定记录
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 您还没有绑定账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        // 删除绑定记录
        await ctx.database.remove('maibot_bindings', { userId })

        return `✅ 解绑成功！\n已解绑的用户ID: ${maskUserId(bindings[0].maiUid)}`
      } catch (error: any) {
        ctx.logger('maibot').error('解绑失败:', error)
        return `❌ 解绑失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 查询绑定状态
   * 用法: /mai状态 [--expired]
   */
  ctx.command('mai状态', '查询绑定状态')
    .option('expired', '--expired  显示过期票券')
    .action(async ({ session, options }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId

      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 您还没有绑定账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        let statusInfo = `✅ 已绑定账号\n\n` +
                        `用户ID: ${maskUserId(binding.maiUid)}\n` +
                        `绑定时间: ${new Date(binding.bindTime).toLocaleString('zh-CN')}\n` +
                        `🚨 /maialert查看账号提醒状态\n`

        // 尝试获取最新状态并更新数据库
        try {
          const preview = await api.preview(binding.maiUid)
          
          // 更新数据库中的用户名和Rating
          await ctx.database.set('maibot_bindings', { userId }, {
            userName: preview.UserName,
            rating: preview.Rating,
          })
          
          statusInfo += `\n📊 账号信息：\n` +
                       `用户名: ${preview.UserName}\n` +
                       `Rating: ${preview.Rating}\n` +
                       `登录状态: ${preview.IsLogin}\n` +
                       `封禁状态: ${preview.BanState}\n`
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

        // 显示票券信息
        try {
          const chargeInfo = await api.getCharge(binding.maiUid)
          if (chargeInfo && chargeInfo.userChargeList && chargeInfo.userChargeList.length > 0) {
            const now = new Date()
            const showExpired = options?.expired || false  // 是否显示过期票券
            
            // 计算总票数（所有stock>0的票券，包括过期的）
            const allValidStockCharges = chargeInfo.userChargeList.filter(charge => charge.stock > 0)
            const totalStock = allValidStockCharges.reduce((sum, charge) => sum + charge.stock, 0)
            
            // 根据是否显示过期票券来过滤
            let displayCharges: typeof chargeInfo.userChargeList
            if (showExpired) {
              // 显示所有stock>0的票券（包括过期的）
              displayCharges = allValidStockCharges
            } else {
              // 只显示未过期且stock>0的票券
              displayCharges = allValidStockCharges.filter(charge => {
                if (charge.validDate) {
                  const validDate = new Date(charge.validDate)
                  return validDate >= now  // 未过期
                }
                return true  // 没有有效期信息的也显示
              })
            }
            
            if (displayCharges.length > 0) {
              statusInfo += `\n\n🎫 票券情况（总票数: ${totalStock}张）${showExpired ? '（包含过期）' : ''}：\n`
              for (const charge of displayCharges) {
                const ticketName = getTicketName(charge.chargeId)
                
                // 检查购买日期是否异常（小于2000年）
                let purchaseDate: string
                if (charge.purchaseDate) {
                  const purchaseDateObj = new Date(charge.purchaseDate)
                  if (purchaseDateObj.getFullYear() < 2000) {
                    purchaseDate = '19**/*/* **:**:00 [Hacked | 异常登录]'
                  } else {
                    purchaseDate = purchaseDateObj.toLocaleString('zh-CN')
                  }
                } else {
                  purchaseDate = '未知'
                }
                
                // 检查有效期日期是否异常（小于2000年）
                let validDate: string
                if (charge.validDate) {
                  const validDateObj = new Date(charge.validDate)
                  if (validDateObj.getFullYear() < 2000) {
                    validDate = '19**/*/* **:**:00 [Hacked | 异常登录]'
                  } else {
                    validDate = validDateObj.toLocaleString('zh-CN')
                  }
                } else {
                  validDate = '未知'
                }
                
                // 检查是否过期（只检查正常日期）
                const isExpired = charge.validDate && new Date(charge.validDate).getFullYear() >= 2000
                  ? new Date(charge.validDate) < now
                  : false
                
                statusInfo += `\n${ticketName} (ID: ${charge.chargeId})${isExpired ? ' [已过期]' : ''}\n`
                statusInfo += `  库存: ${charge.stock}\n`
                statusInfo += `  购买日期: ${purchaseDate}\n`
                statusInfo += `  有效期至: ${validDate}\n`
              }
            } else {
              statusInfo += `\n\n🎫 票券情况: 总票数 ${totalStock}张${showExpired ? '（包含过期）' : ''}`
            }
          } else {
            statusInfo += `\n\n🎫 票券情况: 暂无票券`
          }
        } catch (error) {
          logger.warn('获取票券信息失败:', error)
          statusInfo += `\n\n🎫 票券情况: 获取失败，请检查API服务`
        }

        return statusInfo
      } catch (error: any) {
        ctx.logger('maibot').error('查询状态失败:', error)
        return `❌ 查询失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 锁定账号（登录保持）
   * 用法: /mai锁定
   */
  ctx.command('mai锁定', '锁定账号，防止他人登录')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
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
        const confirm = await promptYesLocal(session, `⚠️ 即将锁定账号 ${maskUserId(binding.maiUid)}\n锁定后账号将保持登录状态，防止他人登录\n确认继续？`)
        if (!confirm) {
          return '操作已取消'
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
               `用户ID: ${maskUserId(binding.maiUid)}\n` +
               `锁定时间: ${new Date().toLocaleString('zh-CN')}\n\n`
        
        if (binding.alertEnabled === true) {
          message += `⚠️ 已自动关闭 maialert 推送（锁定期间不会收到上线/下线提醒）\n`
        }
        
        message += `使用 /mai解锁 可以解锁账号`

        return message
      } catch (error: any) {
        logger.error('锁定账号失败:', error)
        if (error?.response) {
          if (error.response.status === 401) {
            return '❌ 锁定失败：Turnstile校验失败，请检查token配置'
          }
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 锁定失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 解锁账号（登出）
   * 用法: /mai解锁
   */
  ctx.command('mai解锁', '解锁账号（仅限通过mai锁定指令锁定的账号）')
    .alias('mai逃离小黑屋')
    .alias('mai逃离')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]

        // 检查是否通过mai锁定指令锁定
        if (!binding.isLocked) {
          return '⚠️ 账号未锁定\n\n目前只能解锁由 /mai锁定 指令发起的账户。\n其他登录暂时无法解锁。'
        }

        // 确认操作
        const confirm = await promptYesLocal(session, `⚠️ 即将解锁账号 ${maskUserId(binding.maiUid)}\n确认继续？`)
        if (!confirm) {
          return '操作已取消'
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

        // 清除锁定信息
        await ctx.database.set('maibot_bindings', { userId }, {
          isLocked: false,
          lockTime: null,
          lockLoginId: null,
        })

        return `✅ 账号已解锁\n` +
               `用户ID: ${maskUserId(binding.maiUid)}\n` +
               `建议稍等片刻再登录`
      } catch (error: any) {
        logger.error('解锁账号失败:', error)
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 解锁失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 绑定水鱼Token
   * 用法: /mai绑定水鱼 <fishToken>
   */
  ctx.command('mai绑定水鱼 <fishToken:text>', '绑定水鱼Token用于B50上传')
    .action(async ({ session }, fishToken) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      if (!fishToken) {
        return '请提供水鱼Token\n用法：/mai绑定水鱼 <token>\n\nToken长度应在127-132字符之间'
      }

      // 验证Token长度
      if (fishToken.length < 127 || fishToken.length > 132) {
        return '❌ Token长度错误，应在127-132字符之间'
      }

      const userId = session.userId

      try {
        // 检查是否已绑定账号
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        // 更新水鱼Token
        await ctx.database.set('maibot_bindings', { userId }, {
          fishToken,
        })

        return `✅ 水鱼Token绑定成功！\nToken: ${fishToken.substring(0, 8)}***${fishToken.substring(fishToken.length - 4)}`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定水鱼Token失败:', error)
        return `❌ 绑定失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 解绑水鱼Token
   * 用法: /mai解绑水鱼
   */
  ctx.command('mai解绑水鱼', '解绑水鱼Token（保留舞萌DX账号绑定）')
    .action(async ({ session }) => {
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
        return `❌ 解绑失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 绑定落雪代码
   * 用法: /mai绑定落雪 <lxnsCode>
   */
  ctx.command('mai绑定落雪 <lxnsCode:text>', '绑定落雪代码用于B50上传')
    .action(async ({ session }, lxnsCode) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      if (!lxnsCode) {
        return '请提供落雪代码\n用法：/mai绑定落雪 <lxns_code>\n\n落雪代码长度必须为15'
      }

      // 验证代码长度
      if (lxnsCode.length !== 15) {
        return '❌ 落雪代码长度错误，必须为15个字符'
      }

      const userId = session.userId

      try {
        // 检查是否已绑定账号
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        // 更新落雪代码
        await ctx.database.set('maibot_bindings', { userId }, {
          lxnsCode,
        })

        return `✅ 落雪代码绑定成功！\n代码: ${lxnsCode.substring(0, 5)}***${lxnsCode.substring(lxnsCode.length - 3)}`
      } catch (error: any) {
        ctx.logger('maibot').error('绑定落雪代码失败:', error)
        return `❌ 绑定失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 解绑落雪代码
   * 用法: /mai解绑落雪
   */
  ctx.command('mai解绑落雪', '解绑落雪代码（保留舞萌DX账号绑定）')
    .action(async ({ session }) => {
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
        return `❌ 解绑失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 发票（2-6倍票）
   * 用法: /mai发票 [倍数]，默认2
   */
  ctx.command('mai发票 [multiple:number]', '为账号发放功能票（2-6倍）')
    .action(async ({ session }, multipleInput) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const multiple = multipleInput ? Number(multipleInput) : 2
      if (!Number.isInteger(multiple) || multiple < 2 || multiple > 6) {
        return '❌ 倍数必须是2-6之间的整数\n例如：/mai发票 3'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        const baseTip = `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放 ${multiple} 倍票`
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

        await session.send('⏳ 已开始请求发票，服务器响应可能需要约10秒，请耐心等待...')

        const ticketResult = await api.getTicket(
          binding.maiUid,
          multiple,
          machineInfo.clientId,
          machineInfo.regionId,
          machineInfo.placeId,
          machineInfo.placeName,
          machineInfo.regionName,
        )

        if (
          ticketResult.LoginStatus === false ||
          ticketResult.LogoutStatus === false ||
          ticketResult.TicketStatus === false
        ) {
          return '❌ 发票失败：服务器返回未成功，请确认是否已在短时间内多次执行发票指令或稍后再试或点击获取二维码刷新账号后再试。'
        }

        return `✅ 已为 ${maskUserId(binding.maiUid)} 发放 ${multiple} 倍票\n请稍等几分钟在游戏内确认`
      } catch (error: any) {
        logger.error('发票失败:', error)
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 发票失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 舞里程发放 / 签到
   * 用法: /mai舞里程 <里程数>
   */
  ctx.command('mai舞里程 <mile:number>', '为账号发放舞里程（maimile）')
    .action(async ({ session }, mileInput) => {
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

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        const baseTip = `⚠️ 即将为 ${maskUserId(binding.maiUid)} 发放 ${mile} 点舞里程`
        const confirmFirst = await promptYesLocal(session, `${baseTip}\n操作具有风险，请谨慎`)
        if (!confirmFirst) {
          return '操作已取消（第一次确认未通过）'
        }

        const confirmSecond = await promptYesLocal(session, '二次确认：若理解风险，请再次输入 Y 执行')
        if (!confirmSecond) {
          return '操作已取消（第二次确认未通过）'
        }

        await session.send('⏳ 已开始请求发放舞里程，服务器响应可能需要数秒，请耐心等待...')

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
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 发放舞里程失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 上传B50到水鱼
   * 用法: /mai上传B50
   */
  ctx.command('mai上传B50', '上传B50数据到水鱼')
    .action(async ({ session }) => {
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

        // 检查是否已绑定水鱼Token
        if (!binding.fishToken) {
          return '❌ 请先绑定水鱼Token\n使用 /mai绑定水鱼 <token> 进行绑定'
        }

        // 维护时间内直接提示，不发起上传请求
        const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
        if (maintenanceMsg) {
          return maintenanceMsg
        }

        // 上传B50
        const result = await api.uploadB50(binding.maiUid, binding.fishToken)

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的水鱼B50任务，请稍后使用 /mai查询B50 查看任务状态，无需重复上传。'
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        scheduleB50Notification(session, result.task_id)

        return `✅ B50上传任务已提交！\n任务ID: ${result.task_id}\n\n使用 /mai查询B50 查看任务状态`
      } catch (error: any) {
        ctx.logger('maibot').error('上传B50失败:', error)
        // 处理请求超时类错误，统一提示
        if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
          let msg = '水鱼B50任务 上传失败，请稍后再试一次。'
          const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
          if (maintenanceMsg) {
            msg += `\n${maintenanceMsg}`
          }
          return msg
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 上传失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 清空功能票
   * 用法: /mai清票
   */
  ctx.command('mai清票', '清空账号的所有功能票')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]
        const confirm = await promptYesLocal(session, `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的所有功能票，确认继续？`)
        if (!confirm) {
          return '操作已取消'
        }

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

        // 如果4个状态都是 false，显示特殊错误信息
        if (
          result.LoginStatus === false &&
          result.LogoutStatus === false &&
          result.UserAllStatus === false &&
          result.UserLogStatus === false
        ) {
          return `清票错误！请点击获取二维码再试一次！\n错误信息： ${JSON.stringify(result)}`
        }

        // 其他失败情况，显示详细错误信息
        return `❌ 清票失败\n错误信息： ${JSON.stringify(result)}`
      } catch (error: any) {
        logger.error('清票失败:', error)
        if (error?.response) {
          const errorInfo = error.response.data ? JSON.stringify(error.response.data) : `${error.response.status} ${error.response.statusText}`
          return `❌ API请求失败\n错误信息： ${errorInfo}`
        }
        return `❌ 清票失败\n错误信息： ${error?.message || '未知错误'}`
      }
    })

  /**
   * 查询B50任务状态
   * 用法: /mai查询B50
   */
  ctx.command('mai查询B50', '查询B50上传任务状态')
    .action(async ({ session }) => {
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

        // 查询任务状态
        const taskStatus = await api.getB50TaskStatus(binding.maiUid)

        if (taskStatus.code !== 0 || !taskStatus.alive_task_id) {
          return 'ℹ️ 当前没有正在进行的B50上传任务'
        }

        // 查询任务详情
        const taskDetail = await api.getB50TaskById(taskStatus.alive_task_id)

        let statusInfo = `📊 B50上传任务状态\n\n` +
                        `任务ID: ${taskStatus.alive_task_id}\n` +
                        `开始时间: ${new Date(parseInt(taskStatus.alive_task_time) * 1000).toLocaleString('zh-CN')}\n`

        if (taskDetail.done) {
          statusInfo += `状态: ✅ 已完成\n`
          if (taskDetail.alive_task_end_time) {
            statusInfo += `完成时间: ${new Date(parseInt(taskDetail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}\n`
          }
          if (taskDetail.error) {
            statusInfo += `错误信息: ${taskDetail.error}\n`
          }
        } else {
          statusInfo += `状态: ⏳ 进行中\n`
          if (taskDetail.error) {
            statusInfo += `错误信息: ${taskDetail.error}\n`
          }
        }

        return statusInfo
      } catch (error: any) {
        ctx.logger('maibot').error('查询B50任务状态失败:', error)
        return `❌ 查询失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 发收藏品
   * 用法: /mai发收藏品
   */
  ctx.command('mai发收藏品', '发放收藏品')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]

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

        await session.send('⏳ 正在发放收藏品，请稍候...')

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
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 发放失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 清收藏品
   * 用法: /mai清收藏品
   */
  ctx.command('mai清收藏品', '清空收藏品')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]

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
          `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的收藏品\n类型: ${selectedType?.label} (${itemKind})\nID: ${itemId}\n确认继续？`
        )
        if (!confirm) {
          return '操作已取消'
        }

        await session.send('⏳ 正在清空收藏品，请稍候...')

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
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 清空失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 上传乐曲成绩
   * 用法: /mai上传乐曲成绩
   */
  ctx.command('mai上传乐曲成绩', '上传游戏乐曲成绩')
    .action(async ({ session }) => {
      if (!session) {
        return '❌ 无法获取会话信息'
      }

      const userId = session.userId
      try {
        const bindings = await ctx.database.get('maibot_bindings', { userId })
        if (bindings.length === 0) {
          return '❌ 请先绑定舞萌DX账号\n使用 /mai绑定 <SGWCMAID...> 进行绑定'
        }

        const binding = bindings[0]

        // 交互式输入乐曲成绩数据
        const scoreData = await promptScoreData(session)
        if (!scoreData) {
          return '操作已取消'
        }

        const levelLabel = LEVEL_OPTIONS.find(opt => opt.value === scoreData.level)?.label || scoreData.level.toString()
        const fcLabel = FC_STATUS_OPTIONS.find(opt => opt.value === scoreData.fcStatus)?.label || scoreData.fcStatus.toString()
        const syncLabel = SYNC_STATUS_OPTIONS.find(opt => opt.value === scoreData.syncStatus)?.label || scoreData.syncStatus.toString()

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

        await session.send('⏳ 正在上传乐曲成绩，请稍候...')

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

        // 如果4个状态都是 false，显示特殊错误信息
        if (
          result.LoginStatus === false &&
          result.LogoutStatus === false &&
          result.UploadStatus === false &&
          result.UserLogStatus === false
        ) {
          return `上传错误！请点击获取二维码再试一次！\n错误信息： ${JSON.stringify(result)}`
        }

        // 其他失败情况，显示详细错误信息
        return `❌ 上传失败\n错误信息： ${JSON.stringify(result)}`
      } catch (error: any) {
        logger.error('上传乐曲成绩失败:', error)
        if (error?.response) {
          const errorInfo = error.response.data ? JSON.stringify(error.response.data) : `${error.response.status} ${error.response.statusText}`
          return `❌ API请求失败\n错误信息： ${errorInfo}`
        }
        return `❌ 上传失败\n错误信息： ${error?.message || '未知错误'}`
      }
    })

  /**
   * 上传落雪B50
   * 用法: /mai上传落雪b50 [lxns_code]
   */
  ctx.command('mai上传落雪b50 [lxnsCode:text]', '上传B50数据到落雪')
    .action(async ({ session }, lxnsCode) => {
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

        // 上传落雪B50
        const result = await api.uploadLxB50(binding.maiUid, finalLxnsCode)

        if (!result.UploadStatus) {
          if (result.msg === '该账号下存在未完成的任务') {
            return '⚠️ 当前账号已有未完成的落雪B50任务，请稍后使用 /mai查询落雪B50 查看任务状态，无需重复上传。'
          }
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        scheduleLxB50Notification(session, result.task_id)

        return `✅ 落雪B50上传任务已提交！\n任务ID: ${result.task_id}\n\n使用 /mai查询落雪B50 查看任务状态`
      } catch (error: any) {
        ctx.logger('maibot').error('上传落雪B50失败:', error)
        // 处理请求超时类错误，统一提示
        if (error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')) {
          let msg = '落雪B50任务 上传失败，请稍后再试一次。'
          const maintenanceMsg = getMaintenanceMessage(maintenanceNotice)
          if (maintenanceMsg) {
            msg += `\n${maintenanceMsg}`
          }
          return msg
        }
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 上传失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 查询落雪B50任务状态
   * 用法: /mai查询落雪B50
   */
  ctx.command('mai查询落雪B50', '查询落雪B50上传任务状态')
    .action(async ({ session }) => {
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

        // 查询任务状态
        const taskStatus = await api.getLxB50TaskStatus(binding.maiUid)

        if (taskStatus.code !== 0 || !taskStatus.alive_task_id) {
          return 'ℹ️ 当前没有正在进行的落雪B50上传任务'
        }

        // 查询任务详情
        const taskDetail = await api.getLxB50TaskById(taskStatus.alive_task_id)

        let statusInfo = `📊 落雪B50上传任务状态\n\n` +
                        `任务ID: ${taskStatus.alive_task_id}\n` +
                        `开始时间: ${new Date(parseInt(taskStatus.alive_task_time) * 1000).toLocaleString('zh-CN')}\n`

        if (taskDetail.done) {
          statusInfo += `状态: ✅ 已完成\n`
          if (taskDetail.alive_task_end_time) {
            statusInfo += `完成时间: ${new Date(parseInt(taskDetail.alive_task_end_time) * 1000).toLocaleString('zh-CN')}\n`
          }
          if (taskDetail.error) {
            statusInfo += `错误信息: ${taskDetail.error}\n`
          }
        } else {
          statusInfo += `状态: ⏳ 进行中\n`
          if (taskDetail.error) {
            statusInfo += `错误信息: ${taskDetail.error}\n`
          }
        }

        return statusInfo
      } catch (error: any) {
        ctx.logger('maibot').error('查询落雪B50任务状态失败:', error)
        return `❌ 查询失败: ${error?.message || '未知错误'}`
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
      logger.debug('插件已停止，跳过检查用户状态')
      return
    }

    try {
      // 在执行 preview 前，再次检查账号是否仍然启用播报且未被锁定（可能在并发执行过程中被修改了）
      const currentBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
      if (currentBinding.length === 0) {
        logger.debug(`用户 ${binding.userId} 绑定记录已删除，跳过检查`)
        return
      }
      
      const current = currentBinding[0]
      if (!current.alertEnabled || current.isLocked) {
        logger.debug(`用户 ${binding.userId} 播报已关闭或账号已锁定，跳过检查 (alertEnabled: ${current.alertEnabled}, isLocked: ${current.isLocked})`)
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        logger.debug('插件已停止，取消预览请求')
        return
      }

      // 再次检查插件状态
      if (!isPluginActive) {
        logger.debug('插件已停止，取消预览请求')
        return
      }

      logger.debug(`检查用户 ${binding.userId} (maiUid: ${maskUserId(binding.maiUid)}) 的状态`)
      
      // 从数据库读取上一次保存的状态（用于比较）
      const lastSavedStatus = current.lastLoginStatus
      logger.debug(`用户 ${binding.userId} 数据库中保存的上一次状态: ${lastSavedStatus} (类型: ${typeof lastSavedStatus})`)
      
      // 获取当前登录状态
      const preview = await api.preview(binding.maiUid)
      const currentLoginStatus = parseLoginStatus(preview.IsLogin)
      logger.info(`用户 ${binding.userId} 当前API返回的登录状态: ${currentLoginStatus} (IsLogin原始值: "${preview.IsLogin}", 类型: ${typeof preview.IsLogin})`)

      // 比较数据库中的上一次状态和当前状态（在更新数据库之前比较）
      // 如果 lastSavedStatus 是 undefined，说明是首次检查，不发送消息
      const statusChanged = lastSavedStatus !== undefined && lastSavedStatus !== currentLoginStatus
      
      if (statusChanged) {
        logger.info(`🔔 检测到用户 ${binding.userId} 状态变化: ${lastSavedStatus} -> ${currentLoginStatus}`)
      }

      // 更新数据库中的状态和用户名（每次检查都更新）
      // 再次检查账号状态，确保在更新前账号仍然启用播报且未被锁定
      const verifyBinding = await ctx.database.get('maibot_bindings', { userId: binding.userId })
      if (verifyBinding.length > 0 && verifyBinding[0].alertEnabled && !verifyBinding[0].isLocked) {
        const updateData: any = {
          lastLoginStatus: currentLoginStatus,
        }
        if (preview.UserName) {
          updateData.userName = preview.UserName
        }
        await ctx.database.set('maibot_bindings', { userId: binding.userId }, updateData)
        logger.debug(`已更新用户 ${binding.userId} 的状态到数据库: ${currentLoginStatus}`)
      }

      // 如果状态发生变化，发送提醒消息
      // 再次检查账号状态，确保在发送消息前账号仍然启用播报且未被锁定
      if (statusChanged) {
        const finalCheck = await ctx.database.get('maibot_bindings', { userId: binding.userId })
        if (finalCheck.length === 0 || !finalCheck[0].alertEnabled || finalCheck[0].isLocked) {
          logger.debug(`用户 ${binding.userId} 在检查过程中播报已关闭或账号已锁定，取消发送消息`)
          return
        }

        // 发送提醒消息
        if (finalCheck[0].guildId && finalCheck[0].channelId) {
          logger.debug(`准备发送消息到 guildId: ${binding.guildId}, channelId: ${binding.channelId}`)
          
          // 尝试使用第一个可用的bot发送消息
          let sent = false
          for (const bot of ctx.bots) {
            try {
              const mention = `<at id="${binding.userId}"/>`
              // 获取玩家名（优先使用最新的，否则使用缓存的）
              const playerName = preview.UserName || binding.userName || '玩家'
              
              // 获取消息模板
              const messageTemplate = currentLoginStatus
                ? alertMessages.loginMessage
                : alertMessages.logoutMessage
              
              // 替换占位符
              const message = messageTemplate
                .replace(/{playerid}/g, playerName)
                .replace(/{at}/g, mention)

              logger.debug(`尝试使用 bot ${bot.selfId} 发送消息: ${message}`)
              await bot.sendMessage(finalCheck[0].channelId, message, finalCheck[0].guildId)
              logger.info(`✅ 已发送状态提醒给用户 ${binding.userId} (${playerName}): ${currentLoginStatus ? '上线' : '下线'}`)
              sent = true
              break // 成功发送后退出循环
            } catch (error) {
              logger.warn(`bot ${bot.selfId} 发送消息失败:`, error)
              // 如果这个bot失败，尝试下一个
              continue
            }
          }
          
          if (!sent) {
            logger.error(`❌ 所有bot都无法发送消息给用户 ${binding.userId}`)
          }
        } else {
          logger.warn(`用户 ${binding.userId} 缺少群组信息 (guildId: ${finalCheck[0].guildId}, channelId: ${finalCheck[0].channelId})，无法发送提醒`)
        }
      } else {
        if (lastSavedStatus === undefined) {
          logger.debug(`用户 ${binding.userId} 首次检查，初始化状态为: ${currentLoginStatus}，不发送消息`)
        } else {
          logger.debug(`用户 ${binding.userId} 状态未变化 (${lastSavedStatus} == ${currentLoginStatus})，跳过`)
        }
      }
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
      logger.debug('插件已停止，取消检查登录状态任务')
      return
    }

    logger.debug('开始检查登录状态...')
    try {
      // 获取所有绑定记录
      const allBindings = await ctx.database.get('maibot_bindings', {})
      logger.debug(`总共有 ${allBindings.length} 个绑定记录`)
      
      // 过滤出启用播报的用户（alertEnabled 为 true），但排除已锁定的账号
      const bindings = allBindings.filter(b => {
        const enabled = b.alertEnabled === true
        const isLocked = b.isLocked === true
        if (enabled && !isLocked) {
          logger.debug(`用户 ${b.userId} 启用了播报 (alertEnabled: ${b.alertEnabled}, guildId: ${b.guildId}, channelId: ${b.channelId})`)
        } else if (enabled && isLocked) {
          logger.debug(`用户 ${b.userId} 启用了播报但账号已锁定，跳过推送`)
        }
        return enabled && !isLocked
      })
      logger.info(`启用播报的用户数量: ${bindings.length}`)
      
      if (bindings.length > 0) {
        logger.debug(`启用播报的用户列表: ${bindings.map(b => `${b.userId}(${maskUserId(b.maiUid)})`).join(', ')}`)
      }
      
      if (bindings.length === 0) {
        logger.debug('没有启用播报的用户，跳过检查')
        return
      }

      // 使用并发处理
      logger.debug(`使用并发数 ${concurrency} 检查 ${bindings.length} 个用户`)
      await processBatch(bindings, concurrency, checkUserStatus)
      
    } catch (error) {
      logger.error('检查登录状态失败:', error)
    }
    logger.debug('登录状态检查完成')
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
   */
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
   */
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
    logger.debug('锁定账号登录状态刷新完成')
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
        if (newState && binding.lastLoginStatus === undefined) {
          try {
            logger.debug(`初始化用户 ${userId} 的登录状态...`)
            const preview = await api.preview(binding.maiUid)
            const loginStatus = parseLoginStatus(preview.IsLogin)
            await ctx.database.set('maibot_bindings', { userId }, {
              lastLoginStatus: loginStatus,
            })
            logger.info(`用户 ${userId} 初始登录状态: ${loginStatus} (IsLogin原始值: "${preview.IsLogin}")`)
          } catch (error) {
            logger.warn(`初始化用户 ${userId} 登录状态失败:`, error)
          }
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
        return `❌ 操作失败: ${error?.message || '未知错误'}`
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
        if (newState && binding.lastLoginStatus === undefined) {
          try {
            logger.debug(`初始化用户 ${targetUserId} 的登录状态...`)
            const preview = await api.preview(binding.maiUid)
            const loginStatus = parseLoginStatus(preview.IsLogin)
            await ctx.database.set('maibot_bindings', { userId: targetUserId }, {
              lastLoginStatus: loginStatus,
            })
            logger.info(`用户 ${targetUserId} 初始登录状态: ${loginStatus} (IsLogin原始值: "${preview.IsLogin}")`)
          } catch (error) {
            logger.warn(`初始化用户 ${targetUserId} 登录状态失败:`, error)
          }
        }

        let resultMessage = `✅ 已${newState ? '开启' : '关闭'}用户 ${targetUserId} 的播报功能`
        if (newState && (!guildId || !channelId)) {
          resultMessage += `\n⚠️ 警告：当前会话缺少群组信息，提醒可能无法发送。`
        }
        
        return resultMessage
      } catch (error: any) {
        logger.error('设置他人播报状态失败:', error)
        return `❌ 操作失败: ${error?.message || '未知错误'}`
      }
    })
}

