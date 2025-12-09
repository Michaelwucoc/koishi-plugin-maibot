# koishi-plugin-maibot

舞萌DX游戏高级操作插件 for Koishi

## 功能特性

- ✅ 用户绑定（通过 SGWCMAID 二维码）
- ✅ 用户解绑
- ✅ 状态查询（实时获取账号信息，自动更新用户名和Rating）
- ✅ 水鱼Token绑定
- ✅ B50上传到水鱼
- ✅ B50任务状态查询
- ✅ 用户ID隐藏显示（防止盗号）
- ✅ 完整的 API 调用封装
- ✅ 数据库存储（SQLite/MySQL/PostgreSQL）

## 安装

```bash
npm install koishi-plugin-maibot
```

## 配置

在 `koishi.yml` 中配置：

```yaml
plugins:
  maibot:
    apiBaseURL: http://localhost:5566  # 你的API服务地址
    apiTimeout: 30000  # 可选，默认30秒
    machineInfo:  # 必填，机台信息
      clientId: 你的客户端ID
      regionId: 你的区域ID
      placeId: 你的场所ID
      placeName: 你的场所名称
      regionName: 你的区域名称
    turnstileToken: 你的Turnstile Token  # 必填
```

**注意**：`machineInfo` 和 `turnstileToken` 为必填配置，需要在配置文件中填写。

## 使用

### 绑定账号
```
/mai绑定 SGWCMAIDxxxxxxxxxxxxx
```

### 查询状态（自动更新用户名和Rating）
```
/mai状态
```

### 解绑账号
```
/mai解绑
```

### 绑定水鱼Token
```
/mai绑定水鱼 <token>
```

### 上传B50到水鱼
```
/mai上传B50
```

### 查询B50任务状态
```
/mai查询B50
```

## API 要求

本插件需要配合 [anti15-api](https://github.com/your-repo/anti15-api) 使用。

API 服务需要提供以下接口：
- `POST /api/qr2userid/<qr_text>` - 二维码转用户ID
- `GET /api/preview?mai_uid=<encrypted_uid>` - 用户状态预览

更多 API 文档请参考 API README。

## 许可证

MIT

