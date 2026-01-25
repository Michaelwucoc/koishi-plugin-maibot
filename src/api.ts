import axios, { AxiosInstance } from 'axios'

export interface ApiConfig {
  baseURL: string
  timeout?: number
}

export class MaiBotAPI {
  private client: AxiosInstance

  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL || 'http://localhost:5566',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * 机台 Ping
   * GET /api/public/mai_ping
   */
  async maiPing(): Promise<{
    returnCode?: number
    serverTime?: number
    result?: string
  }> {
    const response = await this.client.get('/api/public/mai_ping')
    return response.data
  }

  /**
   * 查看用户信息（预览）
   * GET /api/public/get_preview
   * 需要: client_id, qr_text
   */
  async getPreview(clientId: string, qrText: string): Promise<{
    UserID: string | number
    BanState?: number
    IsLogin?: boolean
    LastLoginDate?: string
    LastPlayDate?: string
    Rating?: number
    UserName?: string
    DataVersion?: string
    RomVersion?: string
  }> {
    const response = await this.client.get('/api/public/get_preview', {
      params: {
        client_id: clientId,
        qr_text: qrText,
      },
    })
    return response.data
  }

  /**
   * 上传水鱼 B50
   * POST /api/public/upload_b50
   * 需要: region_id, client_id, place_id, qr_text, fish_token
   */
  async uploadB50(
    regionId: number,
    clientId: string,
    placeId: number,
    qrText: string,
    fishToken: string
  ): Promise<{
    UploadStatus: boolean
    msg: string
    task_id: string
    login_time?: number
    userID?: string
    token?: string
  }> {
    const response = await this.client.post('/api/public/upload_b50', null, {
      params: {
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
        qr_text: qrText,
        fish_token: fishToken,
      },
    })
    return response.data
  }

  /**
   * 查询水鱼 B50 任务状态
   * GET /api/public/get_b50_task_status
   * 需要: mai_uid (加密的用户ID)
   */
  async getB50TaskStatus(maiUid: string): Promise<{
    code: number
    alive_task_id: string | number
    alive_task_time: number
    task_id?: number
    task_status?: string
  }> {
    const response = await this.client.get('/api/public/get_b50_task_status', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }

  /**
   * 根据任务 ID 查询水鱼 B50 任务
   * GET /api/public/get_b50_task_byid
   * 需要: task_id
   */
  async getB50TaskById(taskId: string): Promise<{
    code: number
    alive_task_id: string | number
    alive_task_time: number
    alive_task_end_time?: number | null
    error?: string | null
    logout_status?: boolean | null
    done: boolean
  }> {
    const response = await this.client.get('/api/public/get_b50_task_byid', {
      params: { task_id: taskId },
    })
    return response.data
  }

  /**
   * 上传落雪 B50
   * POST /api/public/upload_lx_b50
   * 需要: region_id, client_id, place_id, qr_text, lxns_code
   */
  async uploadLxB50(
    regionId: number,
    clientId: string,
    placeId: number,
    qrText: string,
    lxnsCode: string
  ): Promise<{
    UploadStatus: boolean
    msg: string
    task_id: string
    login_time?: number
    userID?: string
    token?: string
  }> {
    const response = await this.client.post('/api/public/upload_lx_b50', null, {
      params: {
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
        qr_text: qrText,
        lxns_code: lxnsCode,
      },
    })
    return response.data
  }

  /**
   * 查询落雪 B50 任务状态
   * GET /api/public/get_lx_b50_task_status
   * 需要: mai_uid (加密的用户ID)
   */
  async getLxB50TaskStatus(maiUid: string): Promise<{
    code: number
    alive_task_id: string | number
    alive_task_time: number
    task_id?: number
    task_status?: string
  }> {
    const response = await this.client.get('/api/public/get_lx_b50_task_status', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }

  /**
   * 根据任务 ID 查询落雪 B50 任务
   * GET /api/public/get_lx_b50_task_byid
   * 需要: task_id
   */
  async getLxB50TaskById(taskId: string): Promise<{
    code: number
    alive_task_id: string | number
    alive_task_time: number
    alive_task_end_time?: number | null
    error?: string | null
    logout_status?: boolean | null
    done: boolean
  }> {
    const response = await this.client.get('/api/public/get_lx_b50_task_byid', {
      params: { task_id: taskId },
    })
    return response.data
  }

  /**
   * 测试登录
   * POST /api/private/test_login
   * 需要: region_id, client_id, place_id, qr_text
   */
  async testLogin(
    regionId: number,
    clientId: string,
    placeId: number,
    qrText: string
  ): Promise<{
    login_time?: number
    login_result?: {
      Result: {
        returnCode: number
      }
      Cookie: string
    }
    QrStatus?: boolean
    LoginStatus?: boolean
    LogoutStatus?: boolean
    TicketStatus?: boolean
  }> {
    const response = await this.client.post('/api/private/test_login', null, {
      params: {
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
        qr_text: qrText,
      },
    })
    return response.data
  }

  /**
   * 获取选项文件
   * GET /api/private/get_opt
   * 需要: title_ver, client_id
   */
  async getOpt(titleVer: string, clientId: string): Promise<{
    app_url: string[]
    opt_url: string[]
    latest_app_time?: string | null
    latest_opt_time?: string | null
    error?: string
  }> {
    const response = await this.client.get('/api/private/get_opt', {
      params: {
        title_ver: titleVer,
        client_id: clientId,
      },
    })
    return response.data
  }

  /**
   * 获取密钥信息
   * GET /api/private/get_keyinfo
   * 需要: title_ver, client_id
   */
  async getKeyInfo(titleVer: string, clientId: string): Promise<{
    clientId: string
    placeId: number
    placeName: string
    regionId: number
    regionName: string
    error?: string
  }> {
    const response = await this.client.get('/api/private/get_keyinfo', {
      params: {
        title_ver: titleVer,
        client_id: clientId,
      },
    })
    return response.data
  }

  /**
   * 获取功能票
   * POST /api/private/get_ticket
   * 需要: region_id, client_id, place_id, ticket_id, qr_text
   */
  async getTicket(
    regionId: number,
    clientId: string,
    placeId: number,
    ticketId: number,
    qrText: string
  ): Promise<{
    QrStatus: boolean
    LoginStatus: boolean
    LogoutStatus: boolean
    TicketStatus: boolean
  }> {
    const response = await this.client.post('/api/private/get_ticket', null, {
      params: {
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
        ticket_id: ticketId,
        qr_text: qrText,
      },
    })
    return response.data
  }

  /**
   * 获取用户功能票
   * GET /api/public/get_charge
   * 需要: region_id, client_id, place_id, qr_text
   */
  async getCharge(
    regionId: number,
    clientId: string,
    placeId: number,
    qrText: string
  ): Promise<{
    ChargeStatus: boolean
    LoginStatus: boolean
    LogoutStatus: boolean
    QrStatus: boolean
    userChargeList?: Array<{
      chargeId: number
      extNum1: number
      purchaseDate: string
      stock: number
      validDate: string
    }>
    userFreeChargeList?: Array<{
      chargeId: number
      stock: number
    }>
  }> {
    const response = await this.client.get('/api/public/get_charge', {
      params: {
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
        qr_text: qrText,
      },
    })
    return response.data
  }

  /**
   * 获取收藏品
   * POST /api/private/get_item
   * 需要: region_id, region_name, client_id, place_id, place_name, item_id, item_kind, item_stock, qr_text
   */
  async getItem(
    regionId: number,
    regionName: string,
    clientId: string,
    placeId: number,
    placeName: string,
    itemId: number,
    itemKind: number,
    itemStock: number,
    qrText: string
  ): Promise<{
    QrStatus: boolean
    LoginStatus: boolean
    LogoutStatus: boolean
    UserAllStatus: boolean
  }> {
    const response = await this.client.post('/api/private/get_item', null, {
      params: {
        region_id: regionId,
        region_name: regionName,
        client_id: clientId,
        place_id: placeId,
        place_name: placeName,
        item_id: itemId,
        item_kind: itemKind,
        item_stock: itemStock,
        qr_text: qrText,
      },
    })
    return response.data
  }

  // ========== 以下为旧API，已不再支持，保留用于兼容性 ==========

  /**
   * @deprecated 旧API，已不再支持
   * 二维码转用户ID - 现在使用 getPreview 代替
   */
  async qr2userid(qrText: string): Promise<{ QRStatus: boolean; UserID: string }> {
    // 尝试使用新API获取用户信息
    // 注意：这个方法需要client_id，但旧代码可能没有提供
    // 为了兼容性，这里保留但标记为deprecated
    throw new Error('qr2userid已废弃，请使用getPreview代替')
  }

  /**
   * @deprecated 旧API，已不再支持
   * 用户状态预览 - 现在使用 getPreview 代替（需要qr_text）
   */
  async preview(maiUid: string): Promise<{
    UserID: string
    BanState: string
    IsLogin: string
    LastLoginDate: string
    LastPlayDate: string
    Rating: string
    UserName: string
    DataVersion?: string
    RomVersion?: string
  }> {
    throw new Error('preview已废弃，请使用getPreview代替（需要qr_text）')
  }

  // ========== 以下功能在新API中未提供，已注释 ==========

  /*
  // 清空功能票 - 新API未提供
  async clearTicket(...) { ... }

  // 用户登录（锁号）- 锁定功能已注释
  async login(...) { ... }

  // 用户登出 - 解锁功能已注释
  async logout(...) { ... }

  // 获取1.5倍票 - 新API未提供
  async get15Ticket(...) { ... }

  // 发收藏品 - 新API未提供
  async getItem(...) { ... }

  // 清收藏品 - 新API未提供
  async clearItem(...) { ... }

  // 舞里程签到 / 发舞里程 - 新API未提供
  async maimile(...) { ... }

  // 查询票券情况 - 新API未提供
  async getCharge(...) { ... }

  // 上传游戏乐曲成绩 - 新API未提供
  async uploadScore(...) { ... }
  */
}
