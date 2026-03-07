#!/bin/bash
# 严格格式验证 - 检查来源链接格式

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <markdown-file>"
  exit 1
fi

ERRORS=0
BODY=$(awk '/^---$/{if(++count==2){flag=1;next}}flag' "$FILE")

# 检查是否有概述段落（frontmatter 后直接有非标题文本）
FIRST_LINE=$(echo "$BODY" | grep -v "^$" | head -1)
if ! echo "$FIRST_LINE" | grep -q "^##"; then
  echo "❌ 错误: frontmatter 后有概述段落，应直接开始第一条资讯"
  echo "   发现: $FIRST_LINE"
  ((ERRORS++))
fi

# 检查每个 ## 标题后是否有来源链接
while IFS= read -r line; do
  if [[ $line =~ ^##[[:space:]] ]]; then
    TITLE="$line"
    IN_ITEM=1
    HAS_SOURCE=0
  elif [[ $IN_ITEM -eq 1 ]] && [[ $line =~ ^\*\*来源[：:]\*\* ]]; then
    # 检查是否是链接格式
    if [[ $line =~ \[.*\]\(http ]]; then
      HAS_SOURCE=1
    else
      echo "❌ 错误: 来源不是链接格式"
      echo "   标题: $TITLE"
      echo "   发现: $line"
      echo "   应为: **来源：** [名称](URL)"
      ((ERRORS++))
      HAS_SOURCE=1
    fi
  elif [[ $IN_ITEM -eq 1 ]] && [[ $line =~ ^##[[:space:]] ]]; then
    if [[ $HAS_SOURCE -eq 0 ]]; then
      echo "❌ 错误: 缺少来源链接"
      echo "   标题: $TITLE"
      ((ERRORS++))
    fi
    TITLE="$line"
    HAS_SOURCE=0
  fi
done <<< "$BODY"

# 检查最后一条
if [[ $IN_ITEM -eq 1 ]] && [[ $HAS_SOURCE -eq 0 ]]; then
  echo "❌ 错误: 缺少来源链接"
  echo "   标题: $TITLE"
  ((ERRORS++))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ 严格格式检查通过: $(basename "$FILE")"
  exit 0
else
  echo "❌ 严格格式检查失败: $ERRORS 个错误"
  exit 1
fi
