import { POSTCARD_QUOTE_MAX_CHARS } from '@/lib/postcardQuoteLimit';

/** wall 아카이빙·미입력 슬롯용 (엽서와 동일 상한) */
const POOL = [
  '하루키 작가님, 문장 속 고독이 위로예요.',
  '익숙한 불안이 포근하게 다가와요.',
  '운동화 신고 밤길 걷고 싶어졌어요.',
  '현실과 꿈 사이를 건너게 해 주셔서 고마워요.',
  '노래처럼 흐르는 서술이 너무 좋아요.',
  '비 오는 날과 고양이가 자꾸 떠올라요.',
  '읽을수록 제 안의 울림이 조금씩 커져요.',
  '당신 글은 제게 작은 등대 같은 존재예요.',
  '우울한 일상에 얇은 빛 한 줄기 같아요.',
  '첫 문장부터 다시 읽게 되네요.',
  '말하지 못한 마음을 대신 말해 줘서 고마워요.',
  '조용한 밤에만 펼치고 싶은 책이에요.',
  '냉동고 뒷이야기 잊히지 않아요.',
  '하루키 작가님, 익숙한 불안이 포근한 밤길 같아요.',
  '첫 문장부터 다시 읽고 싶어요.',
].map((s) => s.slice(0, POSTCARD_QUOTE_MAX_CHARS));

/**
 * 아카이빙 한 사이클에서 비어 있는 슬롯 수만큼 문구를 뽑는다 (순서는 섞어 반복).
 * @param {number} count
 * @returns {string[]}
 */
export function pickArchiveFillerTexts(count) {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(shuffled[i % shuffled.length]);
  }
  return out;
}
