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

  # 提取现有值
  TITLE=$(grep "^title:" "$file" | sed 's/^title: *//; s/^"//; s/"$//' || echo "")
  DOMAIN=$(grep "^domain:" "$file" | sed 's/^domain: *//; s/^"//; s/"$//' || echo "")
  DATE=$(grep "^date:" "$file" | sed 's/^date: *//; s/^"//; s/"$//' || echo "")

  NEEDS_FIX=0

  # 检查基本字段引号
  if grep -q "^title: [^\"']" "$file"; then
    NEEDS_FIX=1
  fi
  if grep -q "^domain: [^\"']" "$file"; then
    NEEDS_FIX=1
  fi
  if grep -q "^date: [^\"']" "$file"; then
    NEEDS_FIX=1
  fi

  # 根据 domain 检查特定字段
  if [ "$DOMAIN" = "commercial-opportunity" ]; then
    # opportunitySchema
    if ! grep -q "^finalStatus:" "$file"; then
      NEEDS_FIX=1
    fi
    if ! grep -q "^retrievedCount:" "$file"; then
      NEEDS_FIX=1
    fi
    if ! grep -q "^scoredCount:" "$file"; then
      NEEDS_FIX=1
    fi
    if ! grep -q "^eliminatedCount:" "$file"; then
      NEEDS_FIX=1
    fi
  else
    # newsSchema
    if ! grep -q "^itemCount:" "$file"; then
      NEEDS_FIX=1
    fi
  fi

  if ! grep -q "^generatedAt:" "$file"; then
    NEEDS_FIX=1
  fi

  if [ $NEEDS_FIX -eq 1 ]; then
    echo "  🔧 Auto-fixing $filename..."

    GENERATED_AT="${DATE}T20:00:00+08:00"
    TEMP_FILE=$(mktemp)

    if [ "$DOMAIN" = "commercial-opportunity" ]; then
      # opportunitySchema
      FINAL_STATUS=$(grep "^finalStatus:" "$file" | sed 's/^finalStatus: *//; s/^"//; s/"$//' || echo "no_viable_proposal")
      RETRIEVED=$(grep "^retrievedCount:" "$file" | sed 's/^retrievedCount: *//' || echo "0")
      SCORED=$(grep "^scoredCount:" "$file" | sed 's/^scoredCount: *//' || echo "0")
      ELIMINATED=$(grep "^eliminatedCount:" "$file" | sed 's/^eliminatedCount: *//' || echo "0")

      cat > "$TEMP_FILE" <<EOF
---
title: "$TITLE"
domain: "$DOMAIN"
date: "$DATE"
finalStatus: "$FINAL_STATUS"
retrievedCount: $RETRIEVED
scoredCount: $SCORED
eliminatedCount: $ELIMINATED
generatedAt: "$GENERATED_AT"
---
EOF
    else
      # newsSchema
      ITEM_COUNT=$(grep -c "^## \|^### " "$file" || echo "0")

      cat > "$TEMP_FILE" <<EOF
---
title: "$TITLE"
domain: "$DOMAIN"
date: "$DATE"
itemCount: $ITEM_COUNT
generatedAt: "$GENERATED_AT"
---
EOF
    fi

    # 追加正文
    awk '/^---$/{if(++count==2){flag=1;next}}flag' "$file" >> "$TEMP_FILE"
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

[ $ERRORS -gt 0 ] && exit 1
exit 0
