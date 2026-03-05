#!/bin/bash
# 内容格式验证和自动修复脚本

set -e

DATE_DIR="$1"
if [ -z "$DATE_DIR" ]; then
  echo "Usage: $0 <date-directory>"
  exit 1
fi

PROJECT_ROOT="/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push"
CONTENT_DIR="$PROJECT_ROOT/src/content/daily/$DATE_DIR"

if [ ! -d "$CONTENT_DIR" ]; then
  echo "Error: Directory $CONTENT_DIR does not exist"
  exit 1
fi

echo "🔍 Validating content in $CONTENT_DIR..."

FIXED=0
ERRORS=0

for file in "$CONTENT_DIR"/*.md; do
  [ -e "$file" ] || continue

  filename=$(basename "$file")
  echo "Checking $filename..."

  # 提取 frontmatter
  if ! grep -q "^---$" "$file"; then
    echo "  ❌ Missing frontmatter"
    ((ERRORS++))
    continue
  fi

  # 检查必需字段
  NEEDS_FIX=0

  # 检查 title 是否有引号
  if grep -q "^title: [^\"']" "$file"; then
    echo "  ⚠️  title needs quotes"
    NEEDS_FIX=1
  fi

  # 检查 domain 是否有引号
  if grep -q "^domain: [^\"']" "$file"; then
    echo "  ⚠️  domain needs quotes"
    NEEDS_FIX=1
  fi

  # 检查 date 是否有引号
  if grep -q "^date: [^\"']" "$file"; then
    echo "  ⚠️  date needs quotes"
    NEEDS_FIX=1
  fi

  # 检查是否缺少 itemCount
  if ! grep -q "^itemCount:" "$file"; then
    echo "  ⚠️  missing itemCount"
    NEEDS_FIX=1
  fi

  # 检查是否缺少 generatedAt
  if ! grep -q "^generatedAt:" "$file"; then
    echo "  ⚠️  missing generatedAt"
    NEEDS_FIX=1
  fi

  if [ $NEEDS_FIX -eq 1 ]; then
    echo "  🔧 Auto-fixing $filename..."

    # 提取现有值
    TITLE=$(grep "^title:" "$file" | sed 's/^title: *//; s/^"//; s/"$//')
    DOMAIN=$(grep "^domain:" "$file" | sed 's/^domain: *//; s/^"//; s/"$//')
    DATE=$(grep "^date:" "$file" | sed 's/^date: *//; s/^"//; s/"$//')

    # 统计条目数（## 或 ### 标题）
    ITEM_COUNT=$(grep -c "^## \|^### " "$file" || echo "0")

    # 生成时间戳
    GENERATED_AT="${DATE}T20:00:00+08:00"

    # 创建临时文件
    TEMP_FILE=$(mktemp)

    # 写入修复后的 frontmatter
    cat > "$TEMP_FILE" <<EOF
---
title: "$TITLE"
domain: "$DOMAIN"
date: "$DATE"
itemCount: $ITEM_COUNT
generatedAt: "$GENERATED_AT"
---
EOF

    # 追加正文内容（跳过原 frontmatter）
    awk '/^---$/{if(++count==2){flag=1;next}}flag' "$file" >> "$TEMP_FILE"

    # 替换原文件
    mv "$TEMP_FILE" "$file"

    echo "  ✅ Fixed $filename"
    ((FIXED++))
  else
    echo "  ✅ $filename is valid"
  fi
done

echo ""
echo "📊 Summary:"
echo "  Fixed: $FIXED files"
echo "  Errors: $ERRORS files"

if [ $ERRORS -gt 0 ]; then
  exit 1
fi

exit 0
