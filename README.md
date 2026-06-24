# Dibang — Trust Network DeFi from Real-World Gatherings

We don't store who you are. We store who you've been related to.

Dibang turns the gift economy, humanity's oldest form of credit, into a score you can borrow against. We call it Moi Credit. It lives on-chain on Sui, and it gives away nothing about who you are.

Think about how much trust already runs on gifts. In Korea alone, more than 200,000 weddings and 350,000 funerals a year move tens of trillions of won in cash — what people call 부조 (bujo), relationship money. Every culture has its own version. Who shows up for you, and who you show up for, says more about trust than any credit bureau. But it's all cash. Nobody records it, and finance can't see it.

Dibang already runs at real weddings. The invitation, the guestbook, the cash gift all go through the product, so the data is real. We're not asking anyone to rate their friendships, and we're not guessing from a scraped social graph. When you send money to a friend's wedding and sign their guestbook, that happened, and we log it as one relationship signal.

Weddings are only the start. The same thing happens at a funeral, a birthday party, a university club reunion — anywhere people gather, relationships form and favors get repaid. Dibang is built to reach all of it. A gift, a message, a name in a guestbook: any act between two people is raw material for Moi Credit, and our job is to capture as much of it as we can.

And the trust you build offline doesn't have to stay offline. **Dibang Inyeon** (인연, a meaningful tie) takes the relationships you've already formed in person and helps you make new ones online, through the web of people you already trust. Connect, chat, send a gift — each step adds another signal. Your trust network doesn't just get recorded; it grows.

Under the hood, Moi Credit is a four-layer pipeline, grounded in category theory and a taxonomy of human relationships.

**Layer 1: Classification**
Every event carries a type — what the occasion was, what someone did, and the roles the two people played. A projection functor maps each of those into four basic modes of human relationship that anthropologists have studied for decades: communal sharing, equality matching, authority ranking, market pricing.

**Layer 2: Ledgers**
Signals of the same kind pile into a ledger, and the order they arrive in doesn't change the result. Each ledger becomes a matrix: who gives to whom, who's connected, who pays back.

**Layer 3: Credit**
Then we let trust flow across the network the way PageRank flows across links, so your score depends on the scores of everyone you're tied to. Run it to convergence and you get a single number. Because that number is built entirely from your pattern of relationships, it never needs your identity — two people with the same web of ties get the same score, whoever they are. Mathematicians call this Yoneda's lemma; we call it privacy by construction.

**Layer 4: Integration**
The four modes fold into one trust network, and your place in it resolves to a single value: Moi Credit. It's your position in a living web of trust, not the size of any balance.

It's live on Sui testnet now. Relationships are shared objects, Moi Credit is a Move object anyone can read without learning whose it is, and there are already transactions across 100 wallets. (package, Moi Credit object, relationship object: https://suiscan.xyz/testnet/object/0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d/tx-blocks)

Where this goes is lending. Once a score like this exists on-chain, a lending protocol can read it and put up a loan with nothing behind it but your relationships, settled through Sui's DeFi rails like DeepBook. That part isn't built yet. It's the whole point.

So, back to the start. We don't store who you are. We store who you've been related to. Do that across enough weddings, funerals, birthdays, and ordinary favors, for long enough, and you end up with something no bank has ever had: a real map of who trusts whom.

> Sui Overflow 2026 — submission for the Payment & DeFi track

---

## Why weddings

A wedding is a once-in-a-lifetime full sampling of a person's trust network.

- Rite of passage (happens once) × full mobilization (the whole network turns out) × 부조 (money changes hands) × official record (a guest list remains)
- Who came, how much they gave, what they wrote — gather this data and a person's entire network is captured in a single shot
- Extensible to funerals, first-birthday parties (돌잔치), savings-club gatherings (계모임), and more, but a wedding is the densest entry point

---

## Core logic — the four-layer pipeline

Moi Credit is the four-layer pipeline described in the overview above — classification, ledgers, credit, integration — grounded in category theory and a taxonomy of human relationships.

```
Layer 1  Classification  Type each event (event × action × role), then project it into the
                         four relational modes: communal sharing (CS), equality matching (EM),
                         authority ranking (AR), market pricing (MP)
Layer 2  Ledgers         Fold same-kind signals (order-independent) into per-relationship
                         trust-balance matrices: who gives, who's connected, who repays
Layer 3  Credit          Propagate across the network (PageRank + behavior signals) into one
                         per-wallet score — determined by relationships, not identity
Layer 4  Integration     Unify the modes into a single living trust network, resolved to one
                         Moi Credit value (your position, not the size of a balance)
```

Downstream, that score feeds DeFi — loan limits, payment guarantees, interest rates, settled on Sui rails like DeepBook. That layer isn't built yet; it's the whole point.

### Design principle: store only raw actions, compute the interpretation

On-chain we store only the human action itself (the raw action). Interpretations like "is this a 부조 or a transaction" are not stored — they're computed by rules.

- The same "money handed over" splits into a **부조 (gift)** if (guest → host) and a **transaction** if (host → vendor)
- If you store the interpretation, changing the rule means rewriting all past data — keep only the raw action and you just change the rule

### SBT (Soul Bound Token) — anti credit-laundering

Activity and relationship records are made **non-transferable (soulbound, `key`-only in Move)**.

- Guestbook, cash-gift, and relationship (Ium) records cannot be moved to another wallet → integrity of credit evaluation is guaranteed
- 1 wallet = 1 user = 1 Moi (avatar). Since activity is bound to it, you have to keep using that wallet for future financial activity too
- Only **assets** meant as gifts (e.g., Moi items) are exceptionally transferable (`key + store`)

### Trust balance → credit score

The four relational modes from Layer 1 become trust ledgers. Two are instantiated on-chain today — EM and CS (the EM-money and CS matrices created at bootstrap):

- **EM (equality matching / reciprocity balance)**: 부조, attendance, congratulatory wires — things that can be repaid. The net balance is the size of trust
- **CS (communal sharing / bond strength)**: invitations, sitting together, a hug — direct signals of intimacy even when the money is zero
- **Fulfillment rate**: did you repay what you borrowed, did you keep your promise — direct evidence of your own behavior
- Final credit = network position (PageRank, "who you're entangled with") + your own behavior (fulfillment rate)

---

## On-chain is the SSOT

**The single source of truth for trust and wedding data is on-chain (Sui).** The DB (Supabase) plays a supporting role for display content and caching.

The current code reads some data from the DB, but this is only **transitional**. Don't mistake this for a "DB-first project." Full migration on-chain is an explicit goal.

- Money (cash gifts) is also sent on-chain in SUI (later moving to USDSui)
- The goal is to record even micro-interactions like likes, hearts, and comments on-chain
- Supabase is a last resort

---

## App boundaries — why there are two apps

If you don't understand this split, you'll put features in the wrong app.

### guest-web — the guest conversion funnel

The entire flow where a guest who arrived via a shared link/QR **takes part in the wedding and gets nudged toward the lounge**.

```
Funnel A: View invitation → heart → lounge teaser
Funnel B: Pick which side → relationship/name → cash gift → congratulatory message → done
                                                                  ↓
                                                       nudge to "Enter the lounge"
```

Guests also sign with zkLogin and record directly on-chain.

### dibang-wedding — the logged-in service proper

**Every identified action** of logged-in Hosts and Guests lives here.

- Host: create wedding, manage invitations, announcements, cash-gift ledger, invite hosts
- Guest: enter the lounge, heart/comment on the feed, decorate Moi
- Shared: create Ium (relationship), profile, gift Moi items
- zkLogin auth, on-chain identity, and trust-network features all belong here

---

## Running it

### Prerequisites

- Node.js 20+
- pnpm 9.15+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Go 1.25+
- Sui CLI (`cargo install sui --locked`)

### Install

```bash
pnpm install
```

### Move contracts — build, test, deploy

```bash
cd contracts/dibang_wedding

sui move build           # build
sui move test            # unit tests
```

#### Testnet deploy

```bash
# If Published.toml exists, a new publish is blocked — remove it temporarily, publish, then restore
mv Published.toml Published.toml.bak
sui client publish --gas-budget 500000000
mv Published.toml.bak Published.toml
```

Fill in the following IDs from the deploy output:

| Deploy output | Where it goes |
|-----------|---------|
| **Package ID** | `.env.testnet.sui` → `SUI_PACKAGE_ID`, frontend `.env` → `VITE_SUI_PACKAGE_ID` |
| **UpgradeCap Object ID** | `.env.testnet.sui` → `SUI_UPGRADE_CAP_ID` |

#### Trust Registry bootstrap

Once after deploy, you must create the shared objects the trust graph needs (TrustRegistry + EM/CS matrices). Every on-chain interaction (give/write/invite, etc.) references these matrices, so transactions will fail without them.

```bash
pnpm --filter @gorae/sui-sdk exec tsx scripts/bootstrap-trust.ts
```

Put the 3 IDs it outputs into `TESTNET_CONFIG` in `packages/sui-sdk/src/constants.ts`:

| Output | Field |
|------|------|
| TrustRegistry ID | `trustRegistryId` |
| EM-money Matrix ID | `emMoneyMatrixId` |
| CS Matrix ID | `csMatrixId` |

### Running the apps

Copy each app's `.env.example` to `.env` and fill in the values. The required values are the Supabase connection info (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and the Sui Package ID obtained above.

```bash
pnpm install

# Frontends (each in its own terminal)
pnpm dev:wedding        # dibang-wedding — localhost:5200
pnpm dev:guest          # guest-web — localhost:5201

# Go API
pnpm dev:api:local      # localhost:8080

# Build
pnpm build              # build all frontends
```

---

## Core domain concepts

| Concept | Description |
|------|------|
| **Moi** | The user's avatar and a node in the trust network. 1 user = 1 Moi (persistent) |
| **Ium** | The relationship between two users. An edge in the trust network |
| **Wedding** | A wedding event. The container for the lounge, invitation, guestbook, and cash gifts |
| **WeddingLounge** | The wedding's digital space. Where the feed, photos, and interactions happen |
| **GuestbookEntry** | A single guest's guestbook identity. Messages (GuestbookMessage) hang off it 1:N |
| **CashGift** | A cash-gift record. On-chain, an actual SUI transfer |
| **Host/Guest** | Per-wedding roles. The same user can have a different role at a different wedding |

---

## Project documentation guide

If it's your first time, read in this order:

1. `_onboarding/VISION-AND-INTENT.md` — why Sui (the project owner's own words)
2. `_onboarding/00-READ-FIRST.md` — the things most easily misunderstood
3. `_architecture/DOMAIN_MODEL_SUMMARY.md` — the domain model (SSOT)
4. `_onboarding/08-TRUST-BALANCE-CREDIT-MODEL.md` — the trust-balance / credit model (core IP)
5. `_onboarding/06-SUI-ONCHAIN-DIRECTION.md` — on-chain direction and SBT audit

Beyond that:
- `_onboarding/02-APP-BOUNDARIES.md` — app boundaries in detail
- `_onboarding/04-USER-JOURNEYS.md` — user journeys
- `_research/gathering-taxonomy-trust-balance/` — the original core research on trust balance
- `_code_convention/` — code conventions (Move, SDK, testing, etc.)
