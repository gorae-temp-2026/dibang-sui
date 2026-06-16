package api

import (
	"context"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AuditEntry는 admin write 1건의 감사 기록 입력.
// admin_user_id / admin_email은 context(AuthMiddleware가 채움)에서 끌어온다.
type AuditEntry struct {
	Action        string // 'update' | 'delete' | 'soft_delete'
	ResourceType  string // 'cash_gift' | 'wedding' | ...
	ResourceID    string
	Changes       []byte // JSON ({after} 또는 nil). nil이면 changes=NULL.
	RequestMethod string // 'PATCH' | 'DELETE'
	RequestPath   string
}

// AuditLogger는 admin write 작업을 admin_audit_logs에 남긴다.
type AuditLogger interface {
	Record(ctx context.Context, e AuditEntry) error
}

type auditLogger struct {
	pool *pgxpool.Pool
}

func NewAuditLogger(pool *pgxpool.Pool) AuditLogger {
	return &auditLogger{pool: pool}
}

func (a *auditLogger) Record(ctx context.Context, e AuditEntry) error {
	uid, _ := UserIDFromContext(ctx) // 없으면 invalid → NOT NULL 위반으로 기록 실패(조용한 빈 기록 방지)
	email, _ := EmailFromContext(ctx)

	q := db.New(a.pool)
	return q.InsertAdminAuditLog(ctx, db.InsertAdminAuditLogParams{
		AdminUserID:   uid,
		AdminEmail:    email,
		Action:        e.Action,
		ResourceType:  e.ResourceType,
		ResourceID:    e.ResourceID,
		Changes:       e.Changes,
		RequestMethod: textFromString(e.RequestMethod),
		RequestPath:   textFromString(e.RequestPath),
	})
}

// textFromString: 빈 문자열은 NULL(Valid=false)로.
func textFromString(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}
