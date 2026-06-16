import type { WeddingData } from '@gorae/invitation-ui';
import { InvitationPage } from '../InvitationPage';

const MOCK_DATA: WeddingData = {
  groomName: '김신랑',
  brideName: '이신부',
  date: '2026-07-11T14:00:00',
  venue: {
    name: '몬드리안 이태원 그랜드볼룸',
    address: '서울 용산구 이태원로 49',
  },
  hosts: {
    groomFatherName: '김성공',
    groomMotherName: '박현명',
    brideFatherName: '이정직',
    brideMotherName: '정다정',
  },
  greetingMessage: '작은 떨림이 이어져 큰 기쁨이 되었습니다.\n저희 두 사람, 서로의 곁에서 평생을 함께하기로 약속합니다.\n귀한 걸음 하시어 축복해 주시면 감사하겠습니다.',
  groomAccounts: [
    { role: '아버지', name: '김성공', bank: '국민', number: '234-56-789012' },
    { role: '어머니', name: '박현명', bank: '국민', number: '345-67-890123' },
    { role: '신랑', name: '김신랑', bank: '국민', number: '123-45-678901' },
  ],
  brideAccounts: [
    { role: '아버지', name: '이정직', bank: '우리', number: '567-89-012345' },
    { role: '어머니', name: '정다정', bank: '우리', number: '678-90-123456' },
    { role: '신부', name: '이신부', bank: '우리', number: '456-78-901234' },
  ],
  galleryPhotos: Array.from({ length: 28 }, (_, i) => `/mobile-invitation/gallery${String(i + 1).padStart(2, '0')}.png`),
  coverImageUrl: '/mobile-invitation/cover.png',
  heartCount: 234,
  hostNotice: '주차가 협소하오니\n가급적 대중교통을\n이용해 주세요',
  slug: 'kim-lee-2026',
};

export function MobileInvitation() {
  return <InvitationPage data={MOCK_DATA} />;
}
