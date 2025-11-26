#!/bin/bash
cd "$(dirname "$0")"

echo "📦 准备发布 koishi-plugin-maibot 到 npm..."

# 1. 重新编译
echo "🔨 正在编译 TypeScript..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 编译失败，请检查代码"
  exit 1
fi

# 2. 检查包名是否可用
echo "🔍 检查包名是否可用..."
npm view koishi-plugin-maibot > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "⚠️  包名 koishi-plugin-maibot 已被占用"
  echo "请修改 package.json 中的 name 字段"
  exit 1
fi
echo "✅ 包名可用"

# 3. 预览要发布的内容
echo "📋 预览要发布的内容..."
npm pack --dry-run

# 4. 检查是否登录
echo "🔐 检查 npm 登录状态..."
npm whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️  未登录 npm，请先运行: npm login"
  exit 1
fi
echo "✅ 已登录"

# 5. 发布
echo "🚀 正在发布到 npm..."
npm publish

if [ $? -eq 0 ]; then
  echo "✅ 发布成功！"
  echo "📦 包地址: https://www.npmjs.com/package/koishi-plugin-maibot"
else
  echo "❌ 发布失败"
  exit 1
fi

