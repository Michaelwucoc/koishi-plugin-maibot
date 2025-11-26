# 发布到 npm 的步骤

## 1. 登录 npm

```bash
cd /Users/wujian/Downloads/maibotfinalized/koishi-plugin-maibot
npm login
```

如果没有 npm 账号，先注册：https://www.npmjs.com/signup

## 2. 检查配置

确保 `package.json` 中的信息正确：
- `name`: koishi-plugin-maibot（如果已被占用，需要改名）
- `version`: 1.0.0
- `author`: 可以填写你的名字和邮箱
- `repository`: 如果有 GitHub 仓库，填写仓库地址

## 3. 检查编译文件

确保 `lib/` 目录下有编译好的文件：
- lib/index.js
- lib/index.d.ts
- lib/api.js
- lib/database.js
等

如果没有，运行：
```bash
npm run build
```

## 4. 检查要发布的文件

运行以下命令查看将要发布哪些文件：
```bash
npm pack --dry-run
```

应该只包含：
- lib/ 目录
- README.md
- package.json

## 5. 发布

```bash
npm publish
```

## 6. 验证

发布成功后，可以在 https://www.npmjs.com/package/koishi-plugin-maibot 查看你的包

## 注意事项

1. **包名唯一性**：如果 `koishi-plugin-maibot` 已被占用，需要修改 `package.json` 中的 `name` 字段
2. **版本号**：每次发布新版本需要更新 `version` 字段
3. **私有包**：如果要发布私有包，需要 npm 付费账号，或者使用 `npm publish --access restricted`

## 更新版本

发布新版本时：
```bash
# 更新版本号（会自动更新 package.json）
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# 然后发布
npm publish
```

