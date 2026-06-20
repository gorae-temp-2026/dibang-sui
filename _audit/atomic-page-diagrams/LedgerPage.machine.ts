// [Stately 관리용 스펙 모델 — 방향 A] LedgerPage.md 다이어그램에서 도출.
// 머신 없음(페이지 흐름 이상화 스펙). 화면 = 탭 ∥ Drawer층 (Summary는 flat 렌더).
// 리전 간 이벤트 충돌 방지를 위해 이벤트명에 의미 접미사 사용. guards/actions/actors는 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const ledgerPageMachine = setup({
  types: {
    context: {} as { error: string | null },
    events: {} as
      | { type: 'BACK' }
      | { type: 'SELECT_LEDGER' }
      | { type: 'SELECT_MESSAGES' }
      | { type: 'SELECT_RSVP' }
      | { type: 'SELECT_SHARE' }
      | { type: 'FETCH_NEXT' }       // 장부 무한스크롤
      | { type: 'FETCH_NEXT_MSG' }   // 메시지 무한스크롤
      | { type: 'EXPORT_CSV' }
      | { type: 'OPEN_DETAIL' }      // 카드 클릭
      | { type: 'OPEN_ADD' }         // 추가
      | { type: 'CLOSE_DRAWER' }     // 상세 닫기
      | { type: 'EDIT' }
      | { type: 'DELETE' }
      | { type: 'SUBMIT_EDIT' }
      | { type: 'CLOSE_EDIT' }
      | { type: 'SUBMIT_ADD' }
      | { type: 'CLOSE_ADD' }
      | { type: 'CANCEL_DEL' }
      | { type: 'CONFIRM_DEL' },
  },
  actors: {
    updateGift: fromPromise(async (): Promise<void> => {}), // updateMut
    createGift: fromPromise(async (): Promise<void> => {}), // createMut (성공 콜백 없음)
    deleteGift: fromPromise(async (): Promise<void> => {}), // deleteMut
  },
  actions: {
    loadQueries: () => {}, // 마운트: listCashGifts(infinite)·summary·wedding(→loungeId)·me 병렬
    exportCsv: () => {},   // exportLedgerCsv(gifts)
    setUpdated: () => {},  // selectedGift=updated
  },
  guards: {
    hasLoungeId: () => false, // 받은사진 탭 활성 조건
  },
}).createMachine({
  id: 'ledgerPage',
  context: { error: null },
  initial: 'screen',
  states: {
    screen: {
      entry: 'loadQueries',
      type: 'parallel',
      on: { BACK: { target: 'exitBack' } }, // 뒤로가기 navigate(-1)
      states: {
        // ── 탭 리전 (선택 시 enabled 조회) ──
        tabs: {
          initial: 'ledger',
          on: {
            SELECT_LEDGER: { target: '.ledger' },
            SELECT_MESSAGES: { target: '.messages' },
            SELECT_RSVP: { target: '.rsvp' },
            SELECT_SHARE: { guard: 'hasLoungeId', target: '.sharePhotos' }, // loungeId 없으면 미표시(전이 없음)
          },
          states: {
            // 장부: 로딩/빈 자식 처리 + 무한스크롤
            ledger: {
              on: {
                FETCH_NEXT: {},                  // observer 교차 ∧ hasNextPage → fetchNextPage
                EXPORT_CSV: { actions: 'exportCsv' },
              },
            },
            // 메시지: 로딩/빈/목록은 데이터 파생 렌더 + 무한스크롤
            messages: {
              on: { FETCH_NEXT_MSG: {} },
            },
            // RSVP: 빈/목록(신랑측·신부측 분리)은 데이터 파생 렌더
            rsvp: {},
            // 받은사진: SharePhotosTab(loungeId)
            sharePhotos: {},
          },
        },
        // ── Drawer 스택 리전 ──
        drawer: {
          initial: 'closed',
          states: {
            closed: {
              id: 'ledgerClosed',
              on: {
                OPEN_DETAIL: { target: 'detail' }, // 카드 클릭 → selectedGift
                OPEN_ADD: { target: 'addForm' },   // 추가
              },
            },
            // 상세 Drawer(GiftDetail)
            detail: {
              on: {
                CLOSE_DRAWER: { target: 'closed' }, // selectedGift=null
                EDIT: { target: 'editForm' },
                DELETE: { target: 'delConf' },
              },
            },
            // 수정 Drawer(GiftForm)
            editForm: {
              on: {
                SUBMIT_EDIT: { target: 'savingEdit' },
                CLOSE_EDIT: { target: 'detail' }, // 취소
              },
            },
            savingEdit: {
              invoke: {
                src: 'updateGift',
                onDone: { target: 'detail', actions: 'setUpdated' }, // selectedGift=updated, isEditing=false
                onError: { target: 'editForm' },
              },
            },
            // 추가 Drawer(GiftForm) — createMut, 성공 콜백 없음(드로어 유지)
            addForm: {
              on: {
                SUBMIT_ADD: { target: 'savingAdd' },
                CLOSE_ADD: { target: 'closed' }, // showAddForm=false
              },
            },
            savingAdd: {
              invoke: {
                src: 'createGift',
                onDone: { target: 'addForm' }, // 성공 콜백 없음 → 폼 유지
                onError: { target: 'addForm' },
              },
            },
            // 삭제 확인 다이얼로그
            delConf: {
              on: {
                CANCEL_DEL: { target: 'detail' }, // deleteConfirm=null
                CONFIRM_DEL: { target: 'deleting' },
              },
            },
            deleting: {
              invoke: {
                src: 'deleteGift',
                onDone: { target: 'closed' }, // selectedGift=null, deleteConfirm=null → 화면
                onError: { target: 'detail' },
              },
            },
          },
        },
      },
    },
    exitBack: { type: 'final' }, // navigate(-1)
  },
});
