import axios, { AxiosInstance } from 'axios'

export interface ApiConfig {
  baseURL: string
  timeout?: number
}

export class MaiBotAPI {
  private client: AxiosInstance
  private static readonly ADMIN_PREFIX = '/api/t9yf457788igaga3jvvo'

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
   * 二维码转用户ID
   */
  async qr2userid(qrText: string): Promise<{ QRStatus: boolean; UserID: string }> {
    const response = await this.client.post(`/api/qr2userid/${qrText}`)
    return response.data
  }

  /**
   * 发票（2-6倍）
   */
  async getTicket(
    maiUid: string,
    ticketId: number,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName?: string,
    regionName?: string,
  ): Promise<{
    LoginStatus?: boolean
    LogoutStatus?: boolean
    TicketStatus: boolean
  }> {
    const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/get_ticket`, null, {
      params: {
        mai_uid: maiUid,
        ticket_id: ticketId,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 清空功能票
   */
  async clearTicket(
    maiUid: string,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName: string,
    regionName: string,
  ): Promise<{
    LoginStatus?: boolean
    LogoutStatus?: boolean
    UserAllStatus?: boolean
    UserLogStatus?: boolean
  }> {
    const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/clear_ticket`, null, {
      params: {
        mai_uid: maiUid,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 用户状态预览
   */
  async preview(maiUid: string): Promise<{
    UserID: string
    BanState: string
    IsLogin: string
    LastLoginDate: string
    LastPlayDate: string
    Rating: string
    UserName: string
  }> {
    const response = await this.client.get('/api/preview', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }

  /**
   * 用户登录（锁号）
   */
  async login(
    maiUid: string,
    regionId: number,
    placeId: number,
    clientId: string,
    token: string
  ): Promise<{
    LoginStatus: boolean
    LoginId?: number
    LastLoginDate?: string
    UserID?: number
  }> {
    const response = await this.client.post('/api/login', {
      token,
    }, {
      params: {
        mai_uid: maiUid,
        region_id: regionId,
        place_id: placeId,
        client_id: clientId,
      },
    })
    return response.data
  }

  /**
   * 用户登出
   */
  async logout(
    maiUid: string,
    regionId: string,
    clientId: string,
    placeId: string,
    token: string
  ): Promise<{ LogoutStatus: boolean }> {
    const response = await this.client.post('/api/logout', {
      token,
    }, {
      params: {
        mai_uid: maiUid,
        region_id: regionId,
        client_id: clientId,
        place_id: placeId,
      },
    })
    return response.data
  }

  /**
   * 获取1.5倍票
   */
  async get15Ticket(
    maiUid: string,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName: string,
    regionName: string,
    token: string
  ): Promise<{
    LoginStatus: boolean
    LogoutStatus: boolean
    UserAllStatus: boolean
    UserLogStatus: boolean
  }> {
    const response = await this.client.post('/api/get_15_ticket', {
      token,
    }, {
      params: {
        mai_uid: maiUid,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 上传水鱼 B50
   */
  async uploadB50(maiUid: string, fishToken: string): Promise<{
    UploadStatus: boolean
    msg: string
    task_id: string
  }> {
    const response = await this.client.post('/api/upload_b50', null, {
      params: {
        mai_uid: maiUid,
        fish_token: fishToken,
      },
    })
    return response.data
  }

  /**
   * 查询水鱼 B50 任务状态
   */
  async getB50TaskStatus(maiUid: string): Promise<{
    code: number
    alive_task_id: string
    alive_task_time: string
  }> {
    const response = await this.client.get('/api/get_b50_task_status', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }

  /**
   * 根据ID查询水鱼 B50 任务
   */
  async getB50TaskById(taskId: string): Promise<{
    code: number
    alive_task_id: string
    alive_task_time: string
    alive_task_end_time?: string
    error?: string
    done: boolean
  }> {
    const response = await this.client.get('/api/get_b50_task_byid', {
      params: { taskid: taskId },
    })
    return response.data
  }

  /**
   * 上传落雪 B50
   */
  async uploadLxB50(maiUid: string, lxnsCode: string): Promise<{
    UploadStatus: boolean
    msg: string
    task_id: string
  }> {
    const response = await this.client.post('/api/upload_lx_b50', null, {
      params: {
        mai_uid: maiUid,
        lxns_code: lxnsCode,
      },
    })
    return response.data
  }

  /**
   * 查询落雪 B50 任务状态
   */
  async getLxB50TaskStatus(maiUid: string): Promise<{
    code: number
    alive_task_id: string
    alive_task_time: string
  }> {
    const response = await this.client.get('/api/get_lx_b50_task_status', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }

  /**
   * 根据ID查询落雪 B50 任务
   */
  async getLxB50TaskById(taskId: string): Promise<{
    code: number
    alive_task_id: string
    alive_task_time: string
    alive_task_end_time?: string
    error?: string
    done: boolean
  }> {
    const response = await this.client.get('/api/get_lx_b50_task_byid', {
      params: { taskid: taskId },
    })
    return response.data
  }

  /**
   * 发收藏品
   */
  async getItem(
    maiUid: string,
    itemId: string,
    itemKind: string,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName: string,
    regionName: string,
  ): Promise<{
    LoginStatus?: boolean
    LogoutStatus?: boolean
    ItemStatus?: boolean
  }> {
    const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/get_item`, null, {
      params: {
        mai_uid: maiUid,
        item_id: itemId,
        item_kind: itemKind,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 清收藏品
   */
  async clearItem(
    maiUid: string,
    itemId: string,
    itemKind: string,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName: string,
    regionName: string,
  ): Promise<{
    LoginStatus?: boolean
    LogoutStatus?: boolean
    ClearStatus?: boolean
  }> {
    const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/clear_item`, null, {
      params: {
        mai_uid: maiUid,
        item_id: itemId,
        item_kind: itemKind,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 舞里程签到 / 发舞里程
   */
  async maimile(
    maiUid: string,
    maiMile: number,
    clientId: string,
    regionId: number,
    placeId: number,
    placeName: string,
    regionName: string,
  ): Promise<{
    LoginStatus?: boolean
    LogoutStatus?: boolean
    MileStatus?: boolean
    CurrentMile?: number
  }> {
    const response = await this.client.post(`${MaiBotAPI.ADMIN_PREFIX}/maimile`, null, {
      params: {
        mai_uid: maiUid,
        mai_mile: maiMile,
        client_id: clientId,
        region_id: regionId,
        place_id: placeId,
        place_name: placeName,
        region_name: regionName,
      },
    })
    return response.data
  }

  /**
   * 查询票券情况
   */
  async getCharge(maiUid: string): Promise<{
    length: number
    userChargeList: Array<{
      chargeId: number
      extNum1: number
      purchaseDate: string
      stock: number
      validDate: string
    }>
    userId: number
  }> {
    const response = await this.client.get('/api/charge', {
      params: { mai_uid: maiUid },
    })
    return response.data
  }
}

