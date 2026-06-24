# Dibang / Moi Credit — English Pitch (v2.1)

> 저장일: 2026-06-24
> 용도: 해커톤 심사
> 기준: v2(`pitch_EN_v2_260624.md`) → v2.1
> v2→v2.1 변경:
> - Layer 1~4 소제목 복원(`Layer N: 제목` 형식). Layer 4에 "네 갈래 신호를 하나의 신뢰 네트워크로 통합"이라는 알맹이 되살림.
> - 수집 범위 확장 단락 신설: 결혼식뿐 아니라 장례식·생일 파티·대학 동아리 등 관계가 형성되는 모든 모임으로 확장. 두 사람 사이의 모든 행위(선물·메시지·방명록)가 Moi Credit의 재료이며 Dibang은 그것을 수집하려 노력한다.
> - '디방 인연(Dibang Inyeon)' 단락 신설: 오프라인에서 형성된 관계를 바탕으로 온라인에서 새 관계를 만들어 자신의 신뢰 네트워크를 확장하는 기능.

---

We don't store who you are. We store who you've been related to.

Dibang turns the gift economy, humanity's oldest form of credit, into a score you can borrow against. We call it Moi Credit. It lives on-chain on Sui, and it gives away nothing about who you are.

Think about how much trust already runs on gifts. In Korea alone, more than 200,000 weddings and 350,000 funerals a year move tens of trillions of won in cash — what people call 부조, relationship money. Every culture has its own version. Who shows up for you, and who you show up for, says more about trust than any credit bureau. But it's all cash. Nobody records it, and finance can't see it.

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
