// src/lib/report/parse-inbound.ts
// WhatsApp 원문 텍스트를 보고 버킷으로 파싱.
// 형식 예:
//   [완료] 3학년 수학 보강 준비
//   [추가] 학부모 상담 2건
//   [보류] 교재 주문 - 재고 확인 필요
//   [내일] 중간고사 대비 프린트
// 대괄호 라벨이 없으면 기본 '내일 할 일'로 처리.
import type { TaskBucket, TaskTag } from './types';

const LABEL: Record<string, TaskBucket> = {
  '완료': 'done', '한일': 'done', 'done': 'done',
  '추가': 'added', 'added': 'added',
  '보류': 'hold', '홀드': 'hold', 'hold': 'hold',
  '내일': 'plan', '계획': 'plan', 'plan': 'plan',
};

export interface ParsedLine {
  bucket: TaskBucket;
  title: string;
  hold_reason: string | null;
  tag: TaskTag;
}

export function parseInbound(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const lines = (text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    let bucket: TaskBucket = 'plan';
    let body = line;

    const m = line.match(/^\[?\s*([가-힣a-zA-Z]+)\s*\]?\s*(.*)$/);
    if (m && LABEL[m[1].toLowerCase()] ) {
      bucket = LABEL[m[1].toLowerCase()];
      body = m[2].trim();
    } else if (m && LABEL[m[1]]) {
      bucket = LABEL[m[1]];
      body = m[2].trim();
    }
    if (!body) continue;

    // 보류는 " - 사유" 형태 분리
    let hold_reason: string | null = null;
    let title = body;
    if (bucket === 'hold') {
      const dash = body.split(/\s-\s|\s—\s/);
      if (dash.length > 1) { title = dash[0].trim(); hold_reason = dash.slice(1).join(' - ').trim(); }
    }

    out.push({ bucket, title, hold_reason, tag: 'etc' });
  }
  return out;
}
