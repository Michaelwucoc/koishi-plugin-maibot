import { Context, Schema, Session } from 'koishi'
import { MaiBotAPI } from './api'
import { extendDatabase, UserBinding } from './database'

export const name = 'maibot'

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
})

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

async function promptYes(session: Session, message: string, timeout = 10000): Promise<boolean> {
  await session.send(`${message}\n在${timeout / 1000}秒内输入 Y 确认，其它输入取消`)
  try {
    const answer = await session.prompt(timeout)
    return answer?.trim().toUpperCase() === 'Y'
  } catch {
    return false
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

  // 使用配置中的值
  const machineInfo = config.machineInfo
  const turnstileToken = config.turnstileToken

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
    const interval = 15_000
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
            ? `\n完成时间: ${new Date(parseInt(detail.alive_task_end_time)).toLocaleString('zh-CN')}`
            : ''
          await bot.sendMessage(
            channelId,
            `${mention} 水鱼B50任务 ${taskId} 状态更新\n${statusText}${finishTime}`,
            guildId,
          )
          return
        }

        await bot.sendMessage(
          channelId,
          `${mention} 水鱼B50任务 ${taskId} 在预设时间内仍未完成，请稍后使用 /mai查询B50 手动确认`,
          guildId,
        )
      } catch (error) {
        logger.warn('轮询B50任务状态失败', error)
        if (attempts < maxAttempts) {
          ctx.setTimeout(poll, interval)
          return
        }
        await bot.sendMessage(
          channelId,
          `${mention} 水鱼B50任务 ${taskId} 状态查询多次失败，请使用 /mai查询B50 手动确认`,
          guildId,
        )
      }
    }

    ctx.setTimeout(poll, interval)
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
   * 用法: /mai状态
   */
  ctx.command('mai状态', '查询绑定状态')
    .action(async ({ session }) => {
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
                        `绑定时间: ${new Date(binding.bindTime).toLocaleString('zh-CN')}\n`

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

        return statusInfo
      } catch (error: any) {
        ctx.logger('maibot').error('查询状态失败:', error)
        return `❌ 查询失败: ${error?.message || '未知错误'}`
      }
    })

  /**
   * 逃离小黑屋（登出）
   * 用法: /mai逃离小黑屋 <turnstileToken>
   */
  ctx.command('mai逃离小黑屋', '登出MaiDX以逃离小黑屋')
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
        const result = await api.logout(
          binding.maiUid,
          machineInfo.regionId.toString(),
          machineInfo.clientId,
          machineInfo.placeId.toString(),
          turnstileToken,
        )

        if (!result.LogoutStatus) {
          return '❌ 登出失败，服务端未返回成功状态，请稍后重试'
        }

        return `✅ 已尝试为您登出账号，建议稍等片刻再登录\n用户ID: ${maskUserId(binding.maiUid)}`
      } catch (error: any) {
        logger.error('逃离小黑屋失败:', error)
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 登出失败: ${error?.message || '未知错误'}`
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
        const confirmFirst = await promptYes(session, `${baseTip}\n操作具有风险，请谨慎`)
        if (!confirmFirst) {
          return '操作已取消（第一次确认未通过）'
        }

        const confirmSecond = await promptYes(session, '二次确认：若理解风险，请再次输入 Y 执行')
        if (!confirmSecond) {
          return '操作已取消（第二次确认未通过）'
        }

        if (multiple >= 3) {
          const confirmThird = await promptYes(session, '第三次确认：3倍及以上票券风险更高，确定继续？')
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
          return '❌ 发票失败：服务器返回未成功，请确认是否已在短时间内多次执行发票指令或稍后再试'
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

        // 检查是否有正在进行的任务
        try {
          const taskStatus = await api.getB50TaskStatus(binding.maiUid)
          if (taskStatus.code === 0 && taskStatus.alive_task_id) {
            return `⚠️ 已有任务正在进行中\n任务ID: ${taskStatus.alive_task_id}\n开始时间: ${new Date(parseInt(taskStatus.alive_task_time)).toLocaleString('zh-CN')}\n\n使用 /mai查询B50 查看任务状态`
          }
        } catch (error) {
          // 如果没有任务或查询失败，继续上传
        }

        // 上传B50
        const result = await api.uploadB50(binding.maiUid, binding.fishToken)

        if (!result.UploadStatus) {
          return `❌ 上传失败：${result.msg || '未知错误'}`
        }

        scheduleB50Notification(session, result.task_id)

        return `✅ B50上传任务已提交！\n任务ID: ${result.task_id}\n\n使用 /mai查询B50 查看任务状态`
      } catch (error: any) {
        ctx.logger('maibot').error('上传B50失败:', error)
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
        const confirm = await promptYes(session, `⚠️ 即将清空 ${maskUserId(binding.maiUid)} 的所有功能票，确认继续？`)
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

        if (result.ClearStatus === false || result.TicketStatus === false) {
          return '❌ 清票失败：服务器未返回成功状态，请稍后再试'
        }

        return `✅ 已清空 ${maskUserId(binding.maiUid)} 的所有功能票`
      } catch (error: any) {
        logger.error('清票失败:', error)
        if (error?.response) {
          return `❌ API请求失败: ${error.response.status} ${error.response.statusText}`
        }
        return `❌ 清票失败: ${error?.message || '未知错误'}`
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
                        `开始时间: ${new Date(parseInt(taskStatus.alive_task_time)).toLocaleString('zh-CN')}\n`

        if (taskDetail.done) {
          statusInfo += `状态: ✅ 已完成\n`
          if (taskDetail.alive_task_end_time) {
            statusInfo += `完成时间: ${new Date(parseInt(taskDetail.alive_task_end_time)).toLocaleString('zh-CN')}\n`
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
}

