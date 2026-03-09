#!/bin/bash
FILE="$1"
BODY=$(awk '/^---$/{if(++count==2){flag=1;next}}flag' "$FILE")

echo "BODY content:"
echo "---"
echo "$BODY"
echo "---"

echo "Lines:"
echo "$BODY" | while IFS= read -r line; do
  echo "Line: '$line'"
  if [[ $line =~ ^##[[:space:]] ]]; then
    echo "  -> 匹配到标题"
  elif [[ $line =~ ^[[:space:]]*\*\*来源[：:]\*\* ]]; then
    echo "  -> 匹配到来源"
  fi
done
