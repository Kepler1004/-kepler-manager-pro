#!/usr/bin/env python3
"""
kepler-manager-pro 번역 파일에 '일일 업무 작성' 관련 신규 키를 추가합니다.
- JSON을 파싱해서 없는 키만 추가하므로 이미 실행했어도 다시 실행해도 안전합니다.
- 프로젝트 루트(kepler-manager-pro/)에서 실행하세요:  python3 patch_translations.py
"""
import json
from pathlib import Path

NAV_KEYS = {
    "ko": {"daily-report": "일일 업무 작성"},
    "en": {"daily-report": "Daily Report"},
    "zh": {"daily-report": "每日工作汇报"},
}

REPORT_KEYS = {
    "ko": {
        "write_title": "오늘의 업무 보고",
        "write_desc": "퇴근 전에 아래 항목을 작성해주세요.",
        "add_item": "+ 항목 추가",
        "placeholder_item": "내용을 입력하세요",
        "submit": "제출하기",
        "already_submitted_title": "오늘 업무 보고를 이미 작성하셨습니다",
        "already_submitted_desc": "수고하셨습니다! 내일 다시 뵙겠습니다.",
    },
    "en": {
        "write_title": "Today's Work Report",
        "write_desc": "Please fill in the items below before you leave for the day.",
        "add_item": "+ Add item",
        "placeholder_item": "Enter details",
        "submit": "Submit",
        "already_submitted_title": "You've already submitted today's report",
        "already_submitted_desc": "Great work today! See you tomorrow.",
    },
    "zh": {
        "write_title": "今日工作汇报",
        "write_desc": "请在下班前填写以下内容。",
        "add_item": "+ 添加项目",
        "placeholder_item": "请输入内容",
        "submit": "提交",
        "already_submitted_title": "您今天已提交工作汇报",
        "already_submitted_desc": "辛苦了!明天见。",
    },
}

ROOT = Path("src/messages")

def patch(lang: str):
    path = ROOT / f"{lang}.json"
    if not path.exists():
        print(f"[스킵] {path} 없음")
        return
    data = json.loads(path.read_text(encoding="utf-8"))

    data.setdefault("nav", {})
    added_nav = 0
    for k, v in NAV_KEYS[lang].items():
        if k not in data["nav"]:
            data["nav"][k] = v
            added_nav += 1

    data.setdefault("report", {})
    added_report = 0
    for k, v in REPORT_KEYS[lang].items():
        if k not in data["report"]:
            data["report"][k] = v
            added_report += 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[완료] {lang}.json : nav +{added_nav}, report +{added_report}")

if __name__ == "__main__":
    for lang in ("ko", "en", "zh"):
        patch(lang)
