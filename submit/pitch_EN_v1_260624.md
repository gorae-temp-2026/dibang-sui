# Dibang / Moi Credit — English Pitch (v1)

> 저장일: 2026-06-24
> 용도: 해커톤 심사
> 기준 원문: `pitch_EN_original_260624.md`
> v0→v1 변경: ① "We capture it at the source" 단락 신설(현실 오프라인 사건에서 수집 명시) · ② 반복 헤드라인을 bookend 2회로 정리 · ③ 떠 있던 "Projection (functor)"를 Layer 1에 통합 · ④ "Why relationships?"를 날카로운 헤드라인으로 교체

---

**We don't store who you are — we store who you've been related to.**

Dibang turns the world's oldest credit system — the gift economy — into **Moi Credit**: a privacy-preserving, on-chain score, built to unlock uncollateralized loans on Sui.

**The richest trust signal in the world is invisible to finance.** Every year, tens of trillions of won (~$25B) move through Korea's 222K weddings and 358K funerals as cash "relationship money" (부조) — and every culture has its own gift economy. Who shows up, who gives, who reciprocates — it's the richest signal of who you can trust. Yet it's all cash: untracked, un-credited, invisible to finance.

**We capture it at the source.** Dibang is a live product — a digital wedding invitation, guestbook, and cash-gift flow already used at real weddings. The relationship data isn't self-reported or inferred — every signal is captured from a real offline event: an actual gift, an actual guestbook entry, an actual introduction. Every interaction becomes a relationship signal.

**Under the hood — a four-layer pipeline, grounded in category theory and a taxonomy of human relationships:**

*Layer 1 — Classification & Projection.* Every relationship event is typed by a taxonomy of event types, action types, and role pairs — the raw alphabet of social interaction. A projection *functor* then maps each (event × action × role) into a relational signal across the four relational models of human interaction: Communal Sharing, Equality Matching, Authority Ranking, Market Pricing.

*Layer 2 — Dynamics (trust ledgers).* Signals of the same kind are folded — order-independent, like an abelian group — into relational ledgers: matrices of trust edges (giving / connection) and node-level fulfilment (repayment).

*Layer 3 — Credit (Φ).* Ledgers are normalized and propagated through the network by matrix power iteration — a reversed-giving PageRank in the EigenTrust lineage. Identity and associativity let these compose as a category; by Yoneda's lemma, a node is determined by its pattern of relationships, not its identity — exactly what makes Moi Credit privacy-preserving.

*Layer 4 — Integration.* The relational categories are unified into a single trust network and resolved into Moi Credit: one absolute, on-chain score — your position in a living trust network, not the size of any balance.

**Live on Sui.** Relationships are shared objects, and Moi Credit is a composable Move object that can be read anonymously — without ever learning who you are. Deployed on Sui testnet, with on-chain transactions across 100 wallets. (package · Moi Credit object · relationship shared object → https://suiscan.xyz/testnet/object/0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d/tx-blocks)

**Where we're headed.** Moi Credit is built to become the collateral layer for the gift economy — letting lending protocols read your relationship credit to underwrite uncollateralized, relationship-backed loans on Sui, settled through on-chain DeFi rails like DeepBook. That's our roadmap; it's not live yet.

**We don't store who you are — we store who you've been related to.** Dibang's vision: record a hundred years of relationships across all seven billion people, and quantify humanity's entire trust network. Relationships are everything.
