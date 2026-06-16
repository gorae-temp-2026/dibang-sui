package api

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 감사 로거는 context의 admin userID/email을 끌어와 admin_audit_logs에 1행 기록해야 한다.
func TestAuditLogger_Record_InsertsRow(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	adminID := uuid.New()
	resourceID := uuid.New().String()
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, resourceID)
	})

	ctx = WithUserContext(ctx, pgtype.UUID{Bytes: adminID, Valid: true})
	ctx = WithEmailContext(ctx, "admin@gorae.dev")

	logger := NewAuditLogger(pool)
	err := logger.Record(ctx, AuditEntry{
		Action:        "update",
		ResourceType:  "cash_gift",
		ResourceID:    resourceID,
		Changes:       []byte(`{"after":{"amount":50000}}`),
		RequestMethod: "PATCH",
		RequestPath:   "/admin/cash-gifts/" + resourceID,
	})
	require.NoError(t, err, "Record 성공")

	var (
		gotEmail  string
		gotAction string
		gotType   string
		gotChg    []byte
	)
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT admin_email, action, resource_type, changes FROM admin_audit_logs WHERE resource_id = $1`,
		resourceID).Scan(&gotEmail, &gotAction, &gotType, &gotChg))
	assert.Equal(t, "admin@gorae.dev", gotEmail)
	assert.Equal(t, "update", gotAction)
	assert.Equal(t, "cash_gift", gotType)
	assert.JSONEq(t, `{"after":{"amount":50000}}`, string(gotChg))
}

// admin_user_id는 NOT NULL. context에 userID 없으면 기록은 실패해야 한다(조용히 빈 기록 금지).
func TestAuditLogger_Record_MissingUserFails(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	logger := NewAuditLogger(pool)
	err := logger.Record(ctx, AuditEntry{
		Action:       "delete",
		ResourceType: "cash_gift",
		ResourceID:   uuid.New().String(),
	})
	require.Error(t, err, "userID 없으면 NOT NULL 위반으로 실패")
}
