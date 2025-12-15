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
}

declare module 'koishi' {
  interface Tables {
    maibot_bindings: UserBinding
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
  }, {
    primary: 'id',
    autoInc: true,
    // userName、rating、fishToken 和 lxnsCode 可以为空
    unique: ['userId'], // 每个用户只能绑定一个账号
  })
}

