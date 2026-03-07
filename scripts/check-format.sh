#!/bin/bash
# 格式快速检查脚本 - 在生成后立即验证格式

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <markdown-file>"
  exit 1
fi

ERRORS=0

# 提取正文（跳过 frontmatter）
BODY=$(awk '/^---$/{if(++count==2){flag=1;next}}flag' "$FILE")

# 检查顶级标题
if echo "$BODY" | grep -q "^# "; then
  echo "❌ 错误: 发现顶级标题 (# ...)"
  echo "$BODY" | grep "^# "
  ((ERRORS++))
fi

# 检查编号标题
if echo "$BODY" | grep -qE "^##+ [0-9]+\."; then
  echo "❌ 错误: 发现编号标题 (## 1. ...)"
  echo "$BODY" | grep -E "^##+ [0-9]+\."
  ((ERRORS++))
fi

# 检查常见分类标题
if echo "$BODY" | grep -qE "^## (今日概况|核心技术突破|开源项目动态|具身智能|行业趋势|今日检索)"; then
  echo "❌ 错误: 发现分类章节标题"
  echo "$BODY" | grep -E "^## (今日概况|核心技术突破|开源项目动态|具身智能|行业趋势|今日检索)"
  ((ERRORS++))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ 格式检查通过: $(basename "$FILE")"
  exit 0
else
  echo "❌ 格式检查失败: $ERRORS 个错误"
  exit 1
fi
