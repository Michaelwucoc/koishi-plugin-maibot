import type { UserBinding } from './database'

export function normalizePreviewUserId(userId: string | number): string {
  return String(userId)
}

/** 与插件配置 bindingPlayerNameMatch 对应 */
export interface BindingPlayerNameMatchConfig {
  /** 0–100：规范化后玩家名相似度下限（编辑距离比值×100）。100 须完全一致 */
  minSimilarityPercent?: number
}

export interface BindingNameMatchOptions {
  minSimilarityPercent: number
}

const DEFAULT_MIN_SIMILARITY = 100

export function resolveBindingNameMatchOptions(
  cfg?: BindingPlayerNameMatchConfig,
): BindingNameMatchOptions {
  let p = cfg?.minSimilarityPercent
  if (typeof p !== 'number' || Number.isNaN(p)) p = DEFAULT_MIN_SIMILARITY
  p = Math.min(100, Math.max(0, p))
  return { minSimilarityPercent: p }
}

/** 玩家名规范化：去首尾空白 + Unicode NFKC（全角英数、兼容字符等与半角统一） */
export function normalizePlayerNameForMatch(name: string): string {
  return name.normalize('NFKC').trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Uint32Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return dp[n]
}

/** 0–1，分母为 max(len)；用于短玩家名 */
export function playerNameSimilarityRatio(a: string, b: string): number {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return Math.max(0, 1 - levenshtein(a, b) / maxLen)
}

/**
 * 校验 preview 与绑定是否为同一街机账号（加密 UserID + 可选绑定时的玩家名）
 * @param nameMatch 玩家名：先 NFKC 规范化，再按 minSimilarityPercent 比较编辑距离比值
 */
export function verifyPreviewMatchesBinding(
  binding: UserBinding,
  preview: { UserID: string | number; UserName?: string },
  nameMatch: BindingNameMatchOptions = resolveBindingNameMatchOptions(),
): string | null {
  const pid = normalizePreviewUserId(preview.UserID)
  if (pid === '-1' || preview.UserID === -1) {
    return '❌ 无效或过期的二维码，无法完成验证。'
  }
  if (String(binding.maiUid) !== pid) {
    return '❌ 当前二维码对应的街机账号与绑定不一致，请使用已绑定账号本人微信获取的二维码。'
  }
  const boundName = binding.boundPlayerName?.trim()
  if (!boundName || preview.UserName === undefined) {
    return null
  }
  const current = String(preview.UserName).trim()
  const na = normalizePlayerNameForMatch(boundName)
  const nb = normalizePlayerNameForMatch(current)
  if (!na) {
    return null
  }
  if (!nb) {
    return `❌ 玩家名与绑定记录不一致（绑定为「${boundName}」，当前玩家名为空）。如已改名请使用解绑卡流程后重新绑定。`
  }
  const min = nameMatch.minSimilarityPercent
  const ratio = playerNameSimilarityRatio(na, nb)
  const pct = ratio * 100
  if (pct + 1e-9 >= min) {
    return null
  }
  const minDisp = Number.isInteger(min) ? String(min) : min.toFixed(1)
  if (min >= 100) {
    return `❌ 玩家名与绑定记录不一致（绑定为「${boundName}」，当前为「${current}」）。如已改名请使用解绑卡流程后重新绑定。`
  }
  return `❌ 玩家名与绑定记录不一致（绑定为「${boundName}」，当前为「${current}」）。规范化后相似度约 ${pct.toFixed(0)}%（要求≥${minDisp}%）。可在插件配置中调低「玩家名最低相似度」或解绑后重新绑定。`
}

/** lastStateAt：maibot_user_rebind_state.lastBindChangeAt；bindTime：当前绑定记录的 bindTime（无绑定则 0） */
export function msUntilBindChangeAllowed(
  lastStateAtMs: number,
  bindTimeMs: number,
  minIntervalDays: number,
): number {
  const base = Math.max(lastStateAtMs || 0, bindTimeMs || 0)
  if (!base) return 0
  const minMs = Math.max(0, minIntervalDays) * 24 * 60 * 60 * 1000
  const elapsed = Date.now() - base
  return Math.max(0, minMs - elapsed)
}

export function formatBindChangeWaitHuman(ms: number): string {
  if (ms <= 0) return '0'
  const d = Math.floor(ms / (24 * 60 * 60 * 1000))
  const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (d > 0) return `${d} 天${h > 0 ? ` ${h} 小时` : ''}`
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  if (h > 0) return `${h} 小时${m > 0 ? ` ${m} 分钟` : ''}`
  const s = Math.ceil(ms / 1000)
  return `${Math.max(1, s)} 秒`
}
