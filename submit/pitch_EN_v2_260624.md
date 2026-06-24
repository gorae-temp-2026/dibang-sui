# Dibang / Moi Credit — English Pitch (v2)

> 저장일: 2026-06-24
> 용도: 해커톤 심사
> 기준: v1(`pitch_EN_v1_260624.md`) → v2는 "AI 냄새 제거" 버전
> v1→v2 변경: 볼드 문단 헤더 제거 · em-dash 대폭 축소 · 4-layer 템플릿을 산문으로 융합 · 수학 용어는 앵커 2개(projection functor, PageRank)만 남기고 나머지(abelian group, EigenTrust, Yoneda)는 직관/구어체로 · 문장 길이 비균질화 · rule-of-three 축소 · "not X but Y" 반복 축소 · 마무리 슬로건("seven billion people / Relationships are everything") 톤다운

---

We don't store who you are. We store who you've been related to.

Dibang turns the gift economy, humanity's oldest form of credit, into a score you can borrow against. We call it Moi Credit. It lives on-chain on Sui, and it gives away nothing about who you are.

Think about how much trust already runs on gifts. In Korea alone, more than 200,000 weddings and 350,000 funerals a year move tens of trillions of won in cash — what people call 부조, relationship money. Every culture has its own version. Who shows up for you, and who you show up for, says more about trust than any credit bureau. But it's all cash. Nobody records it, and finance can't see it.

Dibang already runs at real weddings. The invitation, the guestbook, the cash gift all go through the product, so the data is real. We're not asking anyone to rate their friendships, and we're not guessing from a scraped social graph. When you send money to a friend's wedding and sign their guestbook, that happened, and we log it as one relationship signal.

Under the hood there's more going on. Every event carries a type: what the occasion was, what someone did, and the roles the two people played. A projection functor maps each of those into four basic modes of human relationship that anthropologists have studied for decades — communal sharing, equality matching, authority ranking, market pricing.

From there it's mostly linear algebra. Signals of the same kind pile into a ledger, and the order they arrive in doesn't change the result. Each ledger is a matrix: who gives to whom, who's connected, who pays back. Then we let trust flow across the network the way PageRank flows across links, so your score depends on the scores of everyone you're tied to. Run it to convergence and you get a single number.

Here's the part we like. Because that number is built entirely from your pattern of relationships, it never needs your identity. Two people with the same web of ties get the same score, whoever they are. Mathematicians call this Yoneda's lemma; we call it privacy by construction.

That number is Moi Credit — your position in a living web of trust, not the size of any balance.

It's live on Sui testnet now. Relationships are shared objects, Moi Credit is a Move object anyone can read without learning whose it is, and there are already transactions across 100 wallets. (package, Moi Credit object, relationship object: https://suiscan.xyz/testnet/object/0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d/tx-blocks)

Where this goes is lending. Once a score like this exists on-chain, a lending protocol can read it and put up a loan with nothing behind it but your relationships, settled through Sui's DeFi rails like DeepBook. That part isn't built yet. It's the whole point.

So, back to the start. We don't store who you are. We store who you've been related to. Do that across enough weddings, funerals, and ordinary favors, for long enough, and you end up with something no bank has ever had: a real map of who trusts whom.
