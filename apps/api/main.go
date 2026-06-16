package main

import (
	"context"
	"flag"
	"log"
	"net/http"

	api "gorae-api/server"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// -env <name> 이면 .env.<name>(예: .env.dev)을 로드. 미지정이면 기존 .env(심링크).
	// 환경별 독립 기동(local 8080 / dev 8081 / prod 8082)을 위해. os.Getenv는 forbidigo라 flag 사용.
	envName := flag.String("env", "", "env file suffix: localhost|dev|prod (loads .env.<name>); empty loads .env")
	flag.Parse()
	envFile := ".env"
	if *envName != "" {
		envFile = ".env." + *envName
	}
	if err := godotenv.Load(envFile); err != nil {
		log.Printf("env: %s 로드 실패(%v) — OS 환경변수에 의존", envFile, err)
	} else {
		log.Printf("env: %s 로드", envFile)
	}

	cfg, err := api.LoadConfig()
	if err != nil {
		log.Fatalf("환경변수 검증 실패: %v", err)
	}

	ctx := context.Background()

	// DB connection
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Services
	userSvc := api.NewUserService(pool)
	invitationSvc := api.NewInvitationService(pool)
	weddingSvc := api.NewWeddingService(pool, invitationSvc)
	guestbookSvc := api.NewGuestbookService(pool)
	cashGiftSvc := api.NewCashGiftService(pool)
	announcementSvc := api.NewAnnouncementService(pool)
	feedSvc := api.NewFeedService(pool)
	feedHeartSvc := api.NewFeedHeartService(pool)
	feedCommentSvc := api.NewFeedCommentService(pool)
	loungeCheckInSvc := api.NewLoungeCheckInService(pool)
	hostInviteSvc := api.NewHostInviteService(pool)

	// Server
	srv := api.NewServer(userSvc, weddingSvc, invitationSvc, guestbookSvc, cashGiftSvc, announcementSvc, feedSvc, feedHeartSvc, feedCommentSvc, loungeCheckInSvc, hostInviteSvc)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOriginsList(),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Auth middleware — Supabase API 위임
	r.Use(api.AuthMiddleware(cfg.SupabaseURL, cfg.SupabaseAnonKey, userSvc.EnsureUser))
	log.Println("Auth: Supabase API auth middleware enabled")

	// AdminGuard — /admin/* 경로는 허용 이메일만. ADMIN_EMAIL은 콤마 구분.
	adminEmails := cfg.AdminEmails()
	r.Use(api.AdminGuard([]string{"/admin/"}, adminEmails))
	log.Printf("Auth: AdminGuard enabled — /admin/* allowlist: %v", adminEmails)

	// 업로드 드라이버 결정 (변수만 — 라우트/미들웨어 등록은 아래에서).
	// UPLOAD_DRIVER=local (dev 명시 opt-in)만 로컬 디스크. 기본·미설정·임의값=Supabase Storage.
	// 기본이 supabase라 prod에서 'local' 명시 안 하면 절대 로컬 안 됨(조용한 폴백 금지).
	var uploader api.StorageUploader
	localUpload := cfg.IsLocalUpload()
	if localUpload {
		uploader = api.NewLocalDiskStorage()
		log.Println("Upload driver: LOCAL DISK (dev only) — /uploads/* 로컬 서빙. prod 사용 금지")
	} else {
		if cfg.SupabaseServiceRoleKey == "" {
			log.Println("WARN: SUPABASE_SERVICE_ROLE_KEY 미설정 — Supabase Storage 업로드는 설정 전까지 실패 (인프라 액션). dev는 UPLOAD_DRIVER=local 사용 가능")
		}
		uploader = api.NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
		log.Println("Upload driver: Supabase Storage")
	}

	// Photo Sharing (T-07~T-11): Server에 의존성 주입 (NewServer 시그니처 보존을 위해 setter 사용).
	// 청사진(faea79e): public/private 2분리 — handler가 카테고리별로 bucket 선택.
	srv.Uploader = uploader
	srv.Pool = pool
	srv.SupabaseURL = cfg.SupabaseURL
	srv.UploadBucketPublic = cfg.UploadBucketPublic
	srv.UploadBucketPrivate = cfg.UploadBucketPrivate

	// Memory Domain Split: 라운지 V2 "온기" 게시물 도메인 주입.
	srv.Memories = api.NewMemoryService(pool)

	// RSVP (QA 2026-05-29 G1): 모바일 청첩장 참석 의사.
	srv.Rsvps = api.NewRsvpService(pool)

	// Wedding MemoryBook: 호스트 큐레이션 사진 + 자동선별 메시지 책자.
	srv.MemoryBook = api.NewMemoryBookService(pool)

	// SharedPhoto Groups: wedding 단위 게스트별 그룹 응답 (메모리북 큐레이션 페이지 소스).
	srv.SharedPhotoGroups = api.NewSharedPhotoGroupsService(pool)

	// Consents: onboarding 동의 게이트 + 마케팅 토글.
	// _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md
	srv.Consents = api.NewConsentService(pool)

	// Admin (운영자 read-only). service_role 키로 auth.users 메타데이터 조회.
	if cfg.SupabaseServiceRoleKey == "" {
		log.Println("WARN: SUPABASE_SERVICE_ROLE_KEY 미설정 — admin auth.users 메타(provider/last_sign_in) 조회 비활성")
	}
	supabaseAdminCl := api.NewSupabaseAdminClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	srv.AdminUsers = api.NewAdminUsersService(pool, supabaseAdminCl)
	srv.AdminDashboard = api.NewAdminDashboardService(pool)

	// Admin write (수정·삭제): /admin/* 은 AdminGuard가 보호. 모든 변경은 admin_audit_logs에 기록.
	srv.AdminMutations = api.NewAdminMutationService(pool, api.NewAuditLogger(pool))

	// POST /uploads(multipart, user 폴더)는 2026-06-10 스토리지 일관화로 폐기 —
	// 모든 업로드는 POST /uploads/presigned 경유 (STORAGE.md). GET /uploads/*는
	// 로컬 디스크 드라이버의 레거시 파일 서빙용으로만 유지.

	// --- 이하 라우트 등록 (모든 r.Use 이후) ---
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	if localUpload {
		// 로컬 드라이버 한정 단일 파일 서빙(디렉토리 리스팅 없음)
		r.Get("/uploads/*", api.NewServeUploadFile())
	}

	// OpenAPI generated routes
	strictHandler := api.NewStrictHandler(srv, nil)
	api.HandlerFromMux(strictHandler, r)

	log.Printf("API server starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
