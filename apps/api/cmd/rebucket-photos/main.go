// rebucket-photos: v3-uploads 단일 버킷의 객체를 청사진(faea79e) 2분리 구조로 재이관.
//
// 분류:
//   v3-mobile-invitation/* → v3-uploads-public  (청첩장 anon GET 유지)
//   v3-share/* | v3-memory/* → v3-uploads-private (signed URL GET)
//   그 외 → skip (옛 시스템 잔재)
//
// 객체 목록: DATABASE_URL 로 storage.objects 직접 조회 (service_role bypass RLS).
// copy: Supabase Storage REST `POST /storage/v1/object/copy` (service_role 키).
// `--apply` 없으면 dry-run.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

// cmdConfig — rebucket-photos 가 사용하는 env 부분집합.
// 컨벤션: _code_convention/ENV_MANAGEMENT.md
type cmdConfig struct {
	DatabaseURL            string `envconfig:"DATABASE_URL"              required:"true"`
	SupabaseURL            string `envconfig:"SUPABASE_URL"              required:"true"`
	SupabaseServiceRoleKey string `envconfig:"SUPABASE_SERVICE_ROLE_KEY" required:"true"`
}

const (
	srcBucket     = "v3-uploads"
	dstBucketPub  = "v3-uploads-public"
	dstBucketPriv = "v3-uploads-private"
)

type copyReq struct {
	BucketID          string `json:"bucketId"`
	SourceKey         string `json:"sourceKey"`
	DestinationBucket string `json:"destinationBucket"`
	DestinationKey    string `json:"destinationKey"`
}

func main() {
	_ = godotenv.Load()
	apply := flag.Bool("apply", false, "if false, dry-run (default)")
	flag.Parse()

	var cfg cmdConfig
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("환경변수 검증 실패: %v", err)
	}
	supabaseURL := strings.TrimRight(cfg.SupabaseURL, "/")
	serviceKey := cfg.SupabaseServiceRoleKey

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	rows, err := pool.Query(ctx, `select name from storage.objects where bucket_id=$1 order by name`, srcBucket)
	if err != nil {
		log.Fatalf("query storage.objects: %v", err)
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			log.Fatalf("scan: %v", err)
		}
		names = append(names, n)
	}
	fmt.Printf("=== %s contains %d objects ===\n", srcBucket, len(names))

	client := &http.Client{Timeout: 30 * time.Second}
	var pubCount, privCount, skipCount, okCount, failCount int
	for _, n := range names {
		var dst string
		switch {
		case strings.HasPrefix(n, "v3-mobile-invitation/"):
			dst = dstBucketPub
			pubCount++
		case strings.HasPrefix(n, "v3-share/"), strings.HasPrefix(n, "v3-memory/"):
			dst = dstBucketPriv
			privCount++
		default:
			skipCount++
			fmt.Printf("  [SKIP] %s\n", n)
			continue
		}
		if !*apply {
			fmt.Printf("  [DRY]  %s → %s/%s\n", n, dst, n)
			continue
		}
		if err := copyObject(client, supabaseURL, serviceKey, srcBucket, n, dst, n); err != nil {
			failCount++
			fmt.Printf("  [FAIL] %s → %s: %v\n", n, dst, err)
			continue
		}
		okCount++
		fmt.Printf("  [OK]   %s → %s\n", n, dst)
	}

	fmt.Printf("\n=== summary ===\n")
	fmt.Printf("  public 대상  : %d\n  private 대상 : %d\n  skip(옛)     : %d\n", pubCount, privCount, skipCount)
	if *apply {
		fmt.Printf("  copy ok      : %d\n  copy fail    : %d\n", okCount, failCount)
	} else {
		fmt.Printf("  (dry-run — --apply 로 실제 copy)\n")
	}
}

func copyObject(c *http.Client, baseURL, key, srcBucket, srcKey, dstBucket, dstKey string) error {
	body, _ := json.Marshal(copyReq{BucketID: srcBucket, SourceKey: srcKey, DestinationBucket: dstBucket, DestinationKey: dstKey})
	req, _ := http.NewRequest(http.MethodPost, baseURL+"/storage/v1/object/copy", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("apikey", key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("%d: %s", resp.StatusCode, string(b))
	}
	return nil
}
