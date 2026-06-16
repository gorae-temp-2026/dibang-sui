#!/usr/bin/env bash
# scripts/use-env.sh — 모든 앱의 .env를 local / dev / prod로 일괄 swap.
# 각 앱에 .env.localhost / .env.dev / .env.prod가 미리 있어야 한다 (gitignore).
# .env는 symlink로 활성 환경을 가리킨다 (ls -l로 확인 가능).
#
# 사용:
#   scripts/use-env.sh status         # 각 앱의 현재 환경 출력
#   scripts/use-env.sh local          # 모든 앱 → 로컬 Supabase (OrbStack)
#   scripts/use-env.sh dev            # 모든 앱 → dev
#   scripts/use-env.sh prod           # 모든 앱 → prod (확인 프롬프트)
#   scripts/use-env.sh prod --yes     # 비대화 모드 (에이전트용)
#
# 대상 앱: apps/*/.env.dev 가 존재하는 모든 앱.
# apps/admin은 런타임 토글이라 제외 (`.env`에 DEV_/PROD_ 키 둘 다 보관).

set -euo pipefail

# 스크립트 위치 기준 repo root
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$ROOT"

cmd=${1:-status}
flag=${2:-}

# 대상 앱 디렉토리: .env.dev 가 있는 곳. (apps/admin 자동 제외 — 거기는 .env.dev 안 만듦)
# macOS bash 3.2 호환을 위해 mapfile 대신 while read.
TARGETS=()
while IFS= read -r dir; do
  TARGETS+=("$dir")
done < <(find apps -maxdepth 2 -name ".env.dev" -exec dirname {} \; | sort)

require_targets() {
  if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "⚠ 대상 앱 없음. 각 앱 디렉토리에 .env.localhost / .env.dev / .env.prod 를 먼저 생성하세요."
    echo "  예: apps/api/.env.localhost, apps/api/.env.dev, apps/api/.env.prod"
    exit 1
  fi
}

print_status() {
  local app
  for app in "${TARGETS[@]}"; do
    local envfile="$app/.env"
    if [[ -L "$envfile" ]]; then
      local target
      target=$(readlink "$envfile")
      printf "  %-30s → %s\n" "$app/.env" "$target"
    elif [[ -f "$envfile" ]]; then
      printf "  %-30s → (일반 파일, 환경 추적 불가)\n" "$app/.env"
    else
      printf "  %-30s → (없음)\n" "$app/.env"
    fi
  done
}

swap_to() {
  local target_env="$1"
  local app missing=0
  for app in "${TARGETS[@]}"; do
    if [[ ! -f "$app/.env.$target_env" ]]; then
      echo "✗ $app/.env.$target_env 없음 — 먼저 생성하세요"
      missing=1
    fi
  done
  if [[ $missing -eq 1 ]]; then
    exit 1
  fi
  for app in "${TARGETS[@]}"; do
    ln -sf ".env.$target_env" "$app/.env"
    echo "  ✓ $app/.env → .env.$target_env"
  done
}

case "$cmd" in
  status)
    if [[ ${#TARGETS[@]} -eq 0 ]]; then
      echo "(아직 .env.dev 가 있는 앱이 없습니다. apps/*/.env.localhost / .env.dev / .env.prod 생성 필요)"
      exit 0
    fi
    echo "현재 환경:"
    print_status
    ;;
  local)
    require_targets
    swap_to localhost
    echo ""
    echo "활성 환경: LOCAL (OrbStack supabase local stack)"
    echo "→ supabase start 가 떠있는지 확인 (Studio: http://127.0.0.1:54323)"
    echo "→ dev 서버가 떠있다면 재시작 필요 (Ctrl+C 후 다시 띄우기)"
    ;;
  dev)
    require_targets
    swap_to dev
    echo ""
    echo "활성 환경: DEV"
    echo "→ dev 서버가 떠있다면 재시작 필요 (Ctrl+C 후 다시 띄우기)"
    ;;
  prod)
    require_targets
    if [[ "$flag" != "--yes" ]]; then
      echo "⚠ PROD 환경으로 전환합니다."
      echo "  대상 앱:"
      printf "    %s\n" "${TARGETS[@]}"
      read -r -p "계속하시겠습니까? [y/N]: " ans
      if [[ ! "$ans" =~ ^[yY]$ ]]; then
        echo "취소"
        exit 1
      fi
    fi
    swap_to prod
    echo ""
    echo "활성 환경: PROD ⚠ (실 데이터 — 쓰기 작업 주의)"
    echo "→ dev 서버가 떠있다면 재시작 필요"
    ;;
  -h|--help|help)
    sed -n '2,15p' "$0"
    ;;
  *)
    echo "Usage: $0 <status|local|dev|prod> [--yes]"
    exit 1
    ;;
esac
