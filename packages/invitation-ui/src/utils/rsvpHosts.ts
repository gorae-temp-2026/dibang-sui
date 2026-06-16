import type { HostInfo, RsvpHostOption } from '../types/invitation';

/**
 * 청첩장 호스트 정보로부터 RSVP "어느 분의 하객이신가요?" 선택지를 만든다.
 *
 * - 순서: 신랑 → 신부 → 신랑 아버지 → 신랑 어머니 → 신부 아버지 → 신부 어머니
 * - 고인(`*Deceased === true`)이거나 성함이 비어 있는 호스트는 제외한다.
 * - 신랑/신부 본인은 고인 플래그가 없으므로 성함만 있으면 항상 포함된다.
 *
 * 최대 6명, 최소 0명(데이터가 모두 비면 빈 배열).
 */
export function getRsvpHostOptions(params: {
  groomName: string;
  brideName: string;
  hosts: HostInfo;
}): RsvpHostOption[] {
  const { groomName, brideName, hosts } = params;

  const candidates: Array<RsvpHostOption & { deceased?: boolean }> = [
    { key: 'groom', role: '신랑', name: groomName },
    { key: 'bride', role: '신부', name: brideName },
    {
      key: 'groomFather',
      role: '신랑 아버지',
      name: hosts.groomFatherName,
      deceased: hosts.groomFatherDeceased,
    },
    {
      key: 'groomMother',
      role: '신랑 어머니',
      name: hosts.groomMotherName,
      deceased: hosts.groomMotherDeceased,
    },
    {
      key: 'brideFather',
      role: '신부 아버지',
      name: hosts.brideFatherName,
      deceased: hosts.brideFatherDeceased,
    },
    {
      key: 'brideMother',
      role: '신부 어머니',
      name: hosts.brideMotherName,
      deceased: hosts.brideMotherDeceased,
    },
  ];

  return candidates
    .filter((c) => !c.deceased && c.name.trim().length > 0)
    .map(({ key, role, name }) => ({ key, role, name }));
}
