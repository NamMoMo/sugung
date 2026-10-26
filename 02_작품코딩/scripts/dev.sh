#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
if ! command -v node >/dev/null 2>&1; then
  if [ -x "$project_dir/.tools/node/bin/node" ]; then
    PATH="$project_dir/.tools/node/bin:$PATH"
    export PATH
  else
    echo 'Node.js 22.12 이상을 설치한 뒤 다시 실행해 주세요.' >&2
    exit 1
  fi
fi
exec npm run dev -- "$@"
