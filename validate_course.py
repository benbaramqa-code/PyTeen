# -*- coding: utf-8 -*-
import sys
from models.course_data import LESSONS, get_lesson_by_id
from utils.code_evaluator import run_user_code, normalize_output

def validate_all():
    print(f"Total lessons found: {len(LESSONS)}")
    assert len(LESSONS) >= 40, f"Expected at least 40 lessons, found {len(LESSONS)}"

    required_fields = [
        "id", "chapter", "title", "recap", "why_learn", "when_to_use",
        "explanation", "tip", "default_code", "expected_output", "hint", "success_message",
        "common_mistakes"
    ]

    all_passed = True
    failed_eval = []
    failed_fields = []
    failed_prompt = []

    for i, lesson in enumerate(LESSONS, start=1):
        # 1. Check ID sequence
        if lesson.id != i:
            print(f"[ERROR] Lesson at index {i} has id {lesson.id}!")
            all_passed = False

        # 2. Check all fields exist and are non-empty strings/ints
        for f in required_fields:
            val = getattr(lesson, f, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                print(f"[ERROR] Lesson {lesson.id} missing or empty field: {f}")
                failed_fields.append((lesson.id, f))
                all_passed = False

        # 3. Check get_gemini_prompt()
        try:
            prompt = lesson.get_gemini_prompt()
            if not prompt or len(prompt) < 100:
                print(f"[ERROR] Lesson {lesson.id} prompt too short or empty!")
                failed_prompt.append(lesson.id)
                all_passed = False
        except Exception as e:
            print(f"[ERROR] Lesson {lesson.id} get_gemini_prompt raised: {e}")
            failed_prompt.append(lesson.id)
            all_passed = False

        # 4. Check code execution and expected output
        eval_res = run_user_code(lesson.default_code)
        if not eval_res["success"]:
            print(f"[FAIL] Lesson {lesson.id} ({lesson.title}) execution error: {eval_res['error']}")
            failed_eval.append((lesson.id, eval_res["error"]))
            all_passed = False
        else:
            actual = normalize_output(eval_res["output"])
            expected = normalize_output(lesson.expected_output)
            if actual != expected:
                print(f"[FAIL] Lesson {lesson.id} output mismatch!")
                print(f"   Actual:   {repr(actual)}")
                print(f"   Expected: {repr(expected)}")
                failed_eval.append((lesson.id, "Output mismatch"))
                all_passed = False
            else:
                print(f"Lesson {lesson.id:02d} [{lesson.chapter}]: PASS")

        # 5. Check get_lesson_by_id
        fetched = get_lesson_by_id(lesson.id)
        assert fetched is lesson, f"get_lesson_by_id({lesson.id}) failed"

    print("\n" + "=" * 50)
    if all_passed:
        print(f"SUCCESS! All {len(LESSONS)} lessons passed all checks perfectly!")
    else:
        print("FAILED checks:")
        if failed_fields:
            print(f"  Missing fields: {failed_fields}")
        if failed_prompt:
            print(f"  Prompt errors: {failed_prompt}")
        if failed_eval:
            print(f"  Evaluation failures: {failed_eval}")
        sys.exit(1)

if __name__ == "__main__":
    validate_all()
