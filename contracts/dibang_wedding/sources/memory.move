/// Memory(메모리) — 라운지에 올리는 사진/영상 메모리.
/// TODO: Seal + Walrus 전환 시 photo_url/text를 blob_id로 교체.
/// 누구나 올릴 수 있음(하객 포함). soulbound(key-only).
module dibang_wedding::memory;

use std::string::String;
use sui::clock::Clock;
use sui::event;
use dibang_wedding::wedding::{Self, Wedding};
use dibang_wedding::ledger;
use dibang_wedding::trust_matrix;
use dibang_wedding::event as gathering;

// === Errors ===

const EWrongEvent: u64 = 0;

// === Structs ===

/// 메모리 항목. soulbound — 작성자에 귀속.
/// TODO: Seal + Walrus 전환 시 text/photo_url → blob_id(vector<u8>).
public struct Memory has key {
    id: UID,
    wedding_id: ID,
    author: address,
    text: String,
    photo_url: String,
    created_at_ms: u64,
}

// === Events ===

public struct MemoryCreated has copy, drop {
    memory_id: ID,
    wedding_id: ID,
    author: address,
    text: String,
    photo_url: String,
    created_at_ms: u64,
}

// === Public functions ===

/// 메모리 작성 — 참가자가 라운지에 사진/영상을 올린다. SHARE_MEMORY CS 신호 기록.
public fun create_memory(
    wedding: &Wedding,
    participation: &gathering::Participation,
    text: String,
    photo_url: String,
    matrix: &mut trust_matrix::TrustMatrix,
    clock: &Clock,
    ctx: &mut TxContext,
): ID {
    assert!(gathering::participation_event_id(participation) == wedding::event_id(wedding), EWrongEvent);
    let host = wedding::primary_host(wedding);
    ledger::log(participation, ledger::action_share_memory(), option::some(host), 0, option::none(), matrix, clock, ctx);

    let wedding_id = object::id(wedding);
    let mem = Memory {
        id: object::new(ctx),
        wedding_id,
        author: ctx.sender(),
        text,
        photo_url,
        created_at_ms: clock.timestamp_ms(),
    };
    let id = object::id(&mem);
    event::emit(MemoryCreated {
        memory_id: id,
        wedding_id,
        author: mem.author,
        text: mem.text,
        photo_url: mem.photo_url,
        created_at_ms: mem.created_at_ms,
    });
    transfer::transfer(mem, ctx.sender());
    id
}

// === Views ===

public fun memory_wedding_id(m: &Memory): ID { m.wedding_id }
public fun memory_author(m: &Memory): address { m.author }
public fun memory_text(m: &Memory): String { m.text }
public fun memory_photo_url(m: &Memory): String { m.photo_url }

// === Tests ===

#[test_only]
use sui::test_scenario as ts;
#[test_only]
use sui::clock;
#[test_only]
use std::unit_test::{assert_eq, destroy};

#[test_only]
const HOST: address = @0xA;
#[test_only]
const GUEST: address = @0x6;

#[test]
fun create_memory_logs_share_memory_action() {
    let mut scenario = ts::begin(HOST);
    wedding::create_default_for_testing(scenario.ctx());

    scenario.next_tx(GUEST);
    let ev = scenario.take_shared<gathering::Event>();
    let clk0 = clock::create_for_testing(scenario.ctx());
    let mut cs_mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    gathering::participate(&ev, gathering::role_guest(), &mut cs_mtx, &clk0, scenario.ctx());
    destroy(cs_mtx);
    clock::destroy_for_testing(clk0);
    ts::return_shared(ev);

    scenario.next_tx(GUEST);
    let wedding = scenario.take_shared<Wedding>();
    let part = scenario.take_from_sender<gathering::Participation>();
    let mut mtx = trust_matrix::new_for_testing(trust_matrix::kind_cs(), 0, scenario.ctx());
    let clk = clock::create_for_testing(scenario.ctx());
    create_memory(&wedding, &part, b"great day".to_string(), b"https://img.test/1.jpg".to_string(), &mut mtx, &clk, scenario.ctx());
    assert_eq!(trust_matrix::pi_of(&mtx, HOST), 138_750_000);
    destroy(mtx);
    clock::destroy_for_testing(clk);
    scenario.return_to_sender(part);
    ts::return_shared(wedding);

    scenario.next_tx(GUEST);
    let rec = scenario.take_from_sender<ledger::ActionRecord>();
    assert_eq!(rec.action_type(), ledger::action_share_memory());
    assert_eq!(rec.actor(), GUEST);
    assert_eq!(rec.target(), option::some(HOST));
    scenario.return_to_sender(rec);
    let mem = scenario.take_from_sender<Memory>();
    assert_eq!(mem.memory_author(), GUEST);
    scenario.return_to_sender(mem);
    scenario.end();
}
