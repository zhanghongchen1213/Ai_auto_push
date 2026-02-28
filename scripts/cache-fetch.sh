#!/bin/bash
# cache-fetch.sh — URL-based file cache with TTL
# Usage: ./scripts/cache-fetch.sh check <url> [ttl_hours]
#        ./scripts/cache-fetch.sh save <url> <content_file>
#        ./scripts/cache-fetch.sh clean [ttl_hours]

set -euo pipefail

PROJECT_ROOT="/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push"
CACHE_DIR="$PROJECT_ROOT/.cache/fetch"
DEFAULT_TTL=24

cmd="${1:-}"
url="${2:-}"

url_hash() {
  echo -n "$1" | shasum -a 256 | cut -d' ' -f1
}

case "$cmd" in
  check)
    ttl="${3:-$DEFAULT_TTL}"
    hash=$(url_hash "$url")
    cache_file="$CACHE_DIR/$hash"

    if [ -f "$cache_file" ]; then
      age=$(( ($(date +%s) - $(stat -f%m "$cache_file")) / 3600 ))
      if [ "$age" -lt "$ttl" ]; then
        echo "HIT"
        cat "$cache_file"
        exit 0
      fi
    fi
    echo "MISS"
    exit 1
    ;;

  save)
    content_file="${3:-}"
    hash=$(url_hash "$url")
    mkdir -p "$CACHE_DIR"
    if [ -n "$content_file" ] && [ -f "$content_file" ]; then
      cp "$content_file" "$CACHE_DIR/$hash"
    else
      cat > "$CACHE_DIR/$hash"
    fi
    echo "SAVED $CACHE_DIR/$hash"
    ;;

  clean)
    ttl="${2:-$DEFAULT_TTL}"
    if [ -d "$CACHE_DIR" ]; then
      find "$CACHE_DIR" -type f -mmin +$((ttl * 60)) -delete
      echo "Cleaned cache files older than ${ttl}h"
    fi
    ;;

  *)
    echo "Usage: $0 {check|save|clean} [args...]"
    exit 1
    ;;
esac
