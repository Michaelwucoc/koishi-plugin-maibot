import { Context } from 'koishi'

export interface UserBinding {
  id: number
  userId: string  // QQ用户ID
  maiUid: string  // 加密后的用户ID
  qrCode: string  // 原始二维码（SGWCMAID...）
  bindTime: Date  // 绑定时间
  userName?: string  // 用户名（从preview获取）
  rating?: string    // Rating（从preview获取）
  fishToken?: string // 水鱼Token
  lxnsCode?: string  // 落雪代码
  alertEnabled?: boolean  // 是否启用播报（默认false）
  lastLoginStatus?: boolean  // 上一次登录状态
  guildId?: string  // 群组ID（用于发送消息）
  channelId?: string  // 频道ID（用于发送消息）
  isLocked?: boolean  // 是否锁定（通过mai锁定指令）
  lockTime?: Date  // 锁定时间
  lockLoginId?: number  // 锁定时的LoginId
  protectionMode?: boolean  // 是否开启保护模式
  lastQrCode?: string  // 最近输入的SGID（用于10分钟内缓存）
  lastQrCodeTime?: Date  // 最近输入SGID的时间戳
}

export interface MaiBotSetting {
  key: string
  boolValue?: boolean
  updatedAt: Date
}

declare module 'koishi' {
  interface Tables {
    maibot_bindings: UserBinding
    maibot_settings: MaiBotSetting
  }
}

export function extendDatabase(ctx: Context) {
  ctx.model.extend('maibot_bindings', {
    id: 'unsigned',
    userId: 'string',
    maiUid: 'string',
    qrCode: 'string',
    bindTime: 'timestamp',
    userName: 'string',
    rating: 'string',
    fishToken: 'string', // 水鱼Token
    lxnsCode: 'string',  // 落雪代码
    alertEnabled: 'boolean',  // 是否启用播报
    lastLoginStatus: 'boolean',  // 上一次登录状态
    guildId: 'string',  // 群组ID
    channelId: 'string',  // 频道ID
    isLocked: 'boolean',  // 是否锁定
    lockTime: 'timestamp',  // 锁定时间
    lockLoginId: 'unsigned',  // 锁定时的LoginId
    protectionMode: 'boolean',  // 是否开启保护模式
    lastQrCode: 'string',  // 最近输入的SGID（用于10分钟内缓存）
    lastQrCodeTime: 'timestamp',  // 最近输入SGID的时间戳
  }, {
    primary: 'id',
    autoInc: true,
    // userName、rating、fishToken、lxnsCode、alertEnabled、lastLoginStatus、guildId、channelId、lastQrCode、lastQrCodeTime 可以为空
    unique: ['userId'], // 每个用户只能绑定一个账号
  })

  // 插件全局设置（用于持久化管理员开关等状态）
  ctx.model.extend('maibot_settings', {
    key: 'string',
    boolValue: 'boolean',
    updatedAt: 'timestamp',
  }, {
    primary: 'key',
  })
}

