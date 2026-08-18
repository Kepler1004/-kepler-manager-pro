#!/usr/bin/env python3
"""
일일 업무 작성 기능 확장용 번역 키 추가
"""
import json
from pathlib import Path

NEW_KEYS = {
    "ko": {
        "click_to_mark_done": "클릭하면 '오늘 한 일'로 이동",
        "readonly": "읽기 전용",
    },
    "en": {
        "click_to_mark_done": "Click to mark as 'Done Today'",
        "readonly": "Read-only",
    },
    "zh": {
        "click_to_mark_done": "点击将其标记为'今日完成'",
        "readonly": "只读",
    },
}

ROOT = Path("src/messages")

def patch(lang: str):
    path = ROOT / f"{lang}.json"
    if not path.exists():
        print(f"[스킵] {path} 없음")
        return
    
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("report", {})
    
    added = 0
    for k, v in NEW_KEYS[lang].items():
        if k not in data["report"]:
            data["report"][k] = v
            added += 1
    
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[완료] {lang}.json : report +{added}")

if __name__ == "__main__":
    for lang in ("ko", "en", "zh"):
        patch(lang)
