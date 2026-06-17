# 배포 서버 URL

> 우리가 배포한 서버들의 **실제 URL 단일 대장**. (Render 서비스 기준)
> render.yaml은 "서비스 정의"(이름·브랜치·빌드)고, 이 문서는 "실제 접속 URL"이다. 역할이 다르다.
> render.yaml만으로 URL을 유추하지 말 것 — Render가 임의 접미사를 붙이기도 한다 (prod api `v3-api` → `v3-api-yrx1`).
> **시크릿 금지**: 여기엔 공개 URL·서비스명·브랜치만 둔다. DATABASE_URL·키·비밀번호는 `.env`(git 밖)에만. (`_code_convention/ENV_MANAGEMENT.md`)
> 갱신: Render 대시보드 또는 Render MCP `list_services`로 실측해 채운다.

## dev (`dev` 브랜치)

| 서비스 | URL | Render 서비스명 |
|--------|-----|-----------------|
| api (Go 백엔드) | https://v3-api-dev.onrender.com | `v3-api-dev` |
| dibang-wedding (로그인 본체) | https://v3-dibang-wedding-dev.onrender.com | `v3-dibang-wedding-dev` |
| guest-web (비로그인 퍼널) | https://v3-guest-web-dev.onrender.com | `v3-guest-web-dev` |

## prod (`main` 브랜치)

| 서비스 | URL | Render 서비스명 |
|--------|-----|-----------------|
| api (Go 백엔드) | https://v3-api-yrx1.onrender.com | `v3-api` |
| dibang-wedding (로그인 본체) | https://v3-dibang-wedding.onrender.com | `v3-dibang-wedding` |
| guest-web (비로그인 퍼널) | https://v3-guest-web.onrender.com | `v3-guest-web` |

## 범위 밖 (여기 없는 것)

- **admin 앱**: render.yaml 블루프린트에 없다. 런타임 토글 앱이라 `scripts/use-env.sh` 대상에서도 제외(`apps/admin`은 `.env`에 DEV_/PROD_ 키 둘 다 보관). 별도 배포처가 생기면 그때 추가.
- **Supabase / DB URL**: 외부 관리형이며 프로젝트 URL·키는 시크릿. `.env`(git 밖)·Supabase 대시보드에만 둔다. 여기에 적지 않는다.
