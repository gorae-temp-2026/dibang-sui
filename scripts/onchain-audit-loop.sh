#!/usr/bin/env bash
# 30분마다 opus 4.8로 온체인 연결 감사 + 자동 수정 실행
# 사용: ./scripts/onchain-audit-loop.sh
# 중지: Ctrl+C

set -euo pipefail
cd "$(dirname "$0")/.."

PROMPT='현재 프로젝트 문서, 코드 전부를 샅샅이 읽고, apps에 있는 모든 함수와 컴포넌트를 분석하여 온체인 연결 안 된 부분을 찾아 sui 온체인 연결을 시켜라. 사진, 사람 이름 정보는 모두 walrus에 올리고 sui와 제대로 연결이 안 되어 있는지 확인하고 직접 e2e 테스트 검증까지 하고 opus 4.8에 검토까지 받아 okay 사인 받을 때 까지 반복하고 okay 사인 받으면 종료해라'

while true; do
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 온체인 감사 시작 ====="
  claude --model claude-opus-4-8 --dangerously-skip-permissions -p "$PROMPT" 2>&1 | tee -a "scripts/.onchain-audit-$(date '+%Y%m%d').log"
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') 완료. 30분 후 재실행 ====="
  sleep 1800
done
