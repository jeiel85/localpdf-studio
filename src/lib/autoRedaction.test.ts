import { describe, it, expect } from 'vitest';
import { scanPageForPrivateInfo, TextItem } from './autoRedaction';

describe('autoRedaction - 개인정보 자동 스캔 엔진 테스트', () => {
  it('단일 TextItem 내에 있는 주민등록번호를 완벽히 탐지하고 좌표를 계산해야 한다', () => {
    const mockItems: TextItem[] = [
      {
        str: '홍길동의 주민번호는 900101-1234567 입니다.',
        width: 300,
        height: 12,
        transform: [1, 0, 0, 1, 50, 100],
      },
    ];

    const results = scanPageForPrivateInfo(mockItems, 1);
    expect(results).toHaveLength(1);
    
    const match = results[0];
    expect(match.type).toBe('jumin');
    expect(match.text).toBe('900101-1234567');
    expect(match.pageNumber).toBe(1);
    expect(match.rects).toHaveLength(1);

    // 비례 분할 오프셋 정확성 검사
    // 전체 문자열 길이: 30자 ('홍길동의 주민번호는 900101-1234567 입니다.')
    // 매칭 문자열 '900101-1234567' 시작 인덱스: 11자, 길이: 14자
    const rect = match.rects[0];
    const expectedCharWidth = 300 / 30; // 30자
    expect(rect.x).toBeCloseTo(50 + 11 * expectedCharWidth, 2); // 11자 오프셋
    expect(rect.width).toBeCloseTo(14 * expectedCharWidth, 2); // 14자
    expect(rect.y).toBe(100);
    expect(rect.height).toBe(12);
  });

  it('여러 TextItem에 걸쳐서 쪼개져 있는 이메일을 올바르게 통합 및 매핑해야 한다', () => {
    // 이메일 'jeiel85@gmail.com'이 두 개의 TextItem으로 나뉘어 들어왔을 때
    const mockItems: TextItem[] = [
      {
        str: '이메일: jeiel85', // 총 12글자 ('이메일: ' (5글자) + 'jeiel85' (7글자))
        width: 100,
        height: 10,
        transform: [1, 0, 0, 1, 10, 200],
      },
      {
        str: '@gmail.com 으로 연락 바랍니다.',
        width: 200,
        height: 10,
        transform: [1, 0, 0, 1, 110, 200],
      },
    ];

    const results = scanPageForPrivateInfo(mockItems, 2);
    expect(results).toHaveLength(1);

    const match = results[0];
    expect(match.type).toBe('email');
    expect(match.text).toBe('jeiel85@gmail.com');
    expect(match.pageNumber).toBe(2);
    expect(match.rects).toHaveLength(2);

    // 첫 번째 Rect 검사 ('jeiel85' 부분, 인덱스 5부터 시작해 7글자 걸침)
    const rect1 = match.rects[0];
    const charWidth1 = 100 / 12; // 12글자
    expect(rect1.x).toBeCloseTo(10 + 5 * charWidth1, 2);
    expect(rect1.width).toBeCloseTo(7 * charWidth1, 2); // 'jeiel85' 7자
    // expectedCharWidth: 100/12자 (공백 포함 총 12자)
    // '이', '메', '일', ':', ' ', 'j', 'e', 'i', 'e', 'l', '8', '5' -> 총 12자
    // 'jeiel85'는 index 5부터 7자
  });

  it('문서 내에 매칭되는 개인정보가 없을 경우 빈 배열을 반환해야 한다', () => {
    const mockItems: TextItem[] = [
      {
        str: '이 문서는 개인정보가 전혀 존재하지 않는 깨끗한 문서입니다.',
        width: 250,
        height: 14,
        transform: [1, 0, 0, 1, 100, 500],
      },
    ];

    const results = scanPageForPrivateInfo(mockItems, 1);
    expect(results).toHaveLength(0);
  });

  it('사업자등록번호, 여권번호, 운전면허번호를 탐지하고 계좌번호 중복은 제거해야 한다', () => {
    const mockItems: TextItem[] = [
      {
        str: '사업자 123-45-67890 여권 M12345678 면허 12-34-567890-12',
        width: 360,
        height: 12,
        transform: [1, 0, 0, 1, 20, 80],
      },
    ];

    const results = scanPageForPrivateInfo(mockItems, 3);
    expect(results.map(result => result.type)).toEqual(['business', 'passport', 'driver']);
    expect(results.map(result => result.text)).toEqual([
      '123-45-67890',
      'M12345678',
      '12-34-567890-12',
    ]);
    expect(results.some(result => result.type === 'account')).toBe(false);
  });
});
