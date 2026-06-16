package api

import (
	"strconv"
	"testing"
	"time"
)

func mkMsg(id, msg, slot string, isHeart bool, createdMinAgo int) curationInput {
	return curationInput{
		ID:            id,
		Message:       msg,
		RecipientSlot: slot,
		IsHeart:       isHeart,
		CreatedAt:     time.Now().Add(-time.Duration(createdMinAgo) * time.Minute),
		GuestName:     "G" + id,
	}
}

func TestSelectMessages_EmptyInput(t *testing.T) {
	texts, hearts := selectMessages(nil)
	if len(texts) != 0 || len(hearts) != 0 {
		t.Fatalf("expected empty, got texts=%d hearts=%d", len(texts), len(hearts))
	}
}

func TestSelectMessages_BelowThirty_KeepsAllSortedOldestFirst(t *testing.T) {
	// 5개 텍스트, created_at 분산 → 결과 길이 5 + 시간순(오래된 순) 정렬
	in := []curationInput{
		mkMsg("a", "msg-a", "groom", false, 10),
		mkMsg("b", "msg-b", "bride", false, 50),
		mkMsg("c", "msg-c", "groom_father", false, 30),
		mkMsg("d", "msg-d", "bride_mother", false, 5),
		mkMsg("e", "msg-e", "groom", false, 100),
	}
	texts, hearts := selectMessages(in)
	if len(texts) != 5 || len(hearts) != 0 {
		t.Fatalf("len texts=%d hearts=%d", len(texts), len(hearts))
	}
	// e(100min ago)가 가장 오래됨 → 첫 번째
	if texts[0].ID != "e" || texts[len(texts)-1].ID != "d" {
		t.Errorf("expected oldest-first; got first=%s last=%s", texts[0].ID, texts[len(texts)-1].ID)
	}
}

func TestSelectMessages_FiltersProfanityAndEmpty(t *testing.T) {
	in := []curationInput{
		mkMsg("a", "정상 메시지", "groom", false, 10),
		mkMsg("b", "시발 욕설", "bride", false, 20),
		mkMsg("c", "   ", "groom", false, 30),
		mkMsg("d", "", "bride", false, 40),
	}
	texts, _ := selectMessages(in)
	if len(texts) != 1 || texts[0].ID != "a" {
		t.Fatalf("expected only 'a' to remain, got %+v", texts)
	}
}

func TestSelectMessages_HeartCappedAtSix(t *testing.T) {
	in := []curationInput{}
	for i := 0; i < 10; i++ {
		in = append(in, mkMsg(strconv.Itoa(i), "__HEART__", "groom", true, i))
	}
	_, hearts := selectMessages(in)
	if len(hearts) != 6 {
		t.Fatalf("hearts cap broken: got %d, want 6", len(hearts))
	}
}

func TestSelectMessages_OverThirty_SideRatio(t *testing.T) {
	// 40 groom + 40 bride + 20 other = 100 text → quotas (floor 0.4*30, 0.4*30, 0.2*30) = 12+12+6 = 30
	in := []curationInput{}
	for i := 0; i < 40; i++ {
		in = append(in, mkMsg("g"+strconv.Itoa(i), "groom message "+strconv.Itoa(i), "groom", false, i))
	}
	for i := 0; i < 40; i++ {
		in = append(in, mkMsg("b"+strconv.Itoa(i), "bride message "+strconv.Itoa(i), "bride_father", false, 1000+i))
	}
	for i := 0; i < 20; i++ {
		// other: recipient_slot 비어있을 일은 없지만, side 매핑상 알 수 없는 값
		in = append(in, mkMsg("o"+strconv.Itoa(i), "other msg "+strconv.Itoa(i), "unknown_slot", false, 2000+i))
	}
	texts, _ := selectMessages(in)
	if len(texts) != 30 {
		t.Fatalf("expected 30, got %d", len(texts))
	}
	g, b, o := 0, 0, 0
	for _, m := range texts {
		switch m.ID[0] {
		case 'g':
			g++
		case 'b':
			b++
		case 'o':
			o++
		}
	}
	if g != 12 || b != 12 || o != 6 {
		t.Errorf("side ratio off: groom=%d bride=%d other=%d (expected 12/12/6)", g, b, o)
	}
}

func TestSelectMessages_FallbackFillsUpToThirty(t *testing.T) {
	// groom 3 + bride 50 = 53 → quotas: groom=floor(3*30/53)=1, bride=floor(50*30/53)=28, other=0 → sum 29 → +1 fallback
	in := []curationInput{}
	for i := 0; i < 3; i++ {
		in = append(in, mkMsg("g"+strconv.Itoa(i), "g"+strconv.Itoa(i), "groom", false, i))
	}
	for i := 0; i < 50; i++ {
		in = append(in, mkMsg("b"+strconv.Itoa(i), "b"+strconv.Itoa(i), "bride", false, 100+i))
	}
	texts, _ := selectMessages(in)
	if len(texts) != 30 {
		t.Fatalf("expected fill to 30, got %d", len(texts))
	}
}

func TestSelectMessages_OutputSortedOldestFirst(t *testing.T) {
	in := []curationInput{}
	for i := 0; i < 50; i++ {
		in = append(in, mkMsg("g"+strconv.Itoa(i), "g"+strconv.Itoa(i), "groom", false, i)) // older index = bigger i = older
	}
	texts, _ := selectMessages(in)
	for i := 1; i < len(texts); i++ {
		if texts[i].CreatedAt.Before(texts[i-1].CreatedAt) {
			t.Fatalf("not sorted oldest-first at %d: prev=%v cur=%v", i, texts[i-1].CreatedAt, texts[i].CreatedAt)
		}
	}
}

func TestSideFromRecipientSlot(t *testing.T) {
	cases := map[string]string{
		"groom":         "groom",
		"groom_father":  "groom",
		"groom_mother":  "groom",
		"bride":         "bride",
		"bride_father":  "bride",
		"bride_mother":  "bride",
		"unknown":       "other",
		"":              "other",
	}
	for input, want := range cases {
		if got := sideFromRecipientSlot(input); got != want {
			t.Errorf("sideFromRecipientSlot(%q) = %q, want %q", input, got, want)
		}
	}
}
