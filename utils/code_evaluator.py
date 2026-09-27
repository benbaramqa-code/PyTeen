import sys
import io
import contextlib
import threading
import queue
import math
import random
import json
import datetime
import string
import re

ALLOWED_MODULES = {
    "math": math,
    "random": random,
    "json": json,
    "datetime": datetime,
    "string": string,
}

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root_name = name.split(".")[0]
    if root_name in ALLOWED_MODULES:
        mod = ALLOWED_MODULES[root_name]
        if fromlist:
            return __import__(name, globals, locals, fromlist, level)
        return mod
    raise ImportError(f"היבוא של המודול '{name}' אינו מורשה בסביבת לימוד זו. מודולים מורשים: {', '.join(ALLOWED_MODULES.keys())}")

def translate_error(error_msg):
    """מתרגם שגיאות פייתון נפוצות לשפה ידידותית וברורה למתחילים."""
    if "SyntaxError" in error_msg:
        if "unexpected EOF" in error_msg or "unclosed" in error_msg:
            return "אופס! נראה ששכחת לסגור סוגריים או גרשיים בסוף. בדוק שוב את השורה!"
        return "שגיאת תחביר (SyntaxError): יש טעות כתיב בקוד, או שחסר פסיק / נקודתיים (:) במקום כלשהו."
    elif "IndentationError" in error_msg:
        return "שגיאת הזחה (IndentationError): בפייתון הרווחים בתחילת השורה קריטיים! ודא שכל הפקודות מיושרות ומודגשות בהזחה נכונה."
    elif "NameError" in error_msg:
        return "שגיאת שם (NameError): השתמשת במשתנה או בפקודה שלא הוגדרו קודם לכן. בדוק שאין שגיאת איות באנגלית."
    elif "TypeError" in error_msg:
        return "שגיאת סוג (TypeError): ניסית לבצע פעולה בין סוגי נתונים שלא מתאימים (למשל לחבר מספר עם טקסט ללא המרה)."
    elif "ZeroDivisionError" in error_msg:
        return "חלוקה באפס (ZeroDivisionError): במתמטיקה ובפייתון אי אפשר לחלק מספר ב-0!"
    elif "IndexError" in error_msg:
        return "חריגה מהרשימה (IndexError): ניסית לגשת לאיבר במיקום שאינו קיים ברשימה."
    elif "KeyError" in error_msg:
        return "שגיאת מפתח (KeyError): המפתח המבוקש אינו קיים במילון."
    elif "AttributeError" in error_msg:
        return "שגיאת תכונה (AttributeError): ניסית לגשת לתכונה או למתודה שאינה קיימת באובייקט."
    elif "ValueError" in error_msg:
        return "ערך לא חוקי (ValueError): הערך שהועבר אינו תואם למה שהפונקציה מצפה לקבל."
    elif "Timeout" in error_msg:
        return "זמן הריצה חרג מ-3 שניות! ייתכן שיש בקוד לולאה אינסופית (כמו while True ללא עצירה)."
    else:
        return f"קרתה שגיאה בהרצת הקוד:\n{error_msg}"

def normalize_output(text):
    """מנרמל פלט לצורך השוואה הוגנת - מסיר רווחים מיותרים בסוף שורות ומאחד ירידות שורה."""
    if not text:
        return ""
    # איחוד \r\n ל-\n, חיתוך שורות והסרת רווחי קצה
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").strip().split("\n")]
    return "\n".join(lines)

def run_user_code(code_str, timeout_seconds=3.0):
    """
    מריץ קוד פייתון בסביבה מבודדת עם הגבלת זמן ומחזיר פלט מפורט.
    """
    if code_str:
        code_str = re.sub(r'[\u200E\u200F\u202A-\u202E\u2066-\u2069]', '', code_str)

    result_queue = queue.Queue()

    def worker():
        output_buffer = io.StringIO()
        safe_builtins = {
            # פונקציות יסוד וטיפוסים
            "print": print,
            "range": range,
            "len": len,
            "int": int,
            "float": float,
            "str": str,
            "bool": bool,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "frozenset": frozenset,
            "sum": sum,
            "max": max,
            "min": min,
            "abs": abs,
            "round": round,
            "pow": pow,
            "divmod": divmod,
            "sorted": sorted,
            "reversed": reversed,
            "enumerate": enumerate,
            "zip": zip,
            "type": type,
            "filter": filter,
            "map": map,
            "all": all,
            "any": any,
            "iter": iter,
            "next": next,
            "repr": repr,
            "format": format,
            "chr": chr,
            "ord": ord,
            "bin": bin,
            "hex": hex,
            "oct": oct,
            "callable": callable,
            "id": id,
            "hash": hash,
            "slice": slice,

            # תכנות מונחה עצמים (OOP)
            "__build_class__": __build_class__,
            "isinstance": isinstance,
            "issubclass": issubclass,
            "hasattr": hasattr,
            "getattr": getattr,
            "setattr": setattr,
            "delattr": delattr,
            "super": super,
            "property": property,
            "staticmethod": staticmethod,
            "classmethod": classmethod,
            "object": object,

            # מודולים מובנים מותרים
            "math": math,
            "random": random,
            "json": json,
            "datetime": datetime,
            "string": string,
            "__import__": safe_import,

            # קבועים
            "True": True,
            "False": False,
            "None": None,

            # חריגות ושגיאות
            "Exception": Exception,
            "BaseException": BaseException,
            "ValueError": ValueError,
            "TypeError": TypeError,
            "ZeroDivisionError": ZeroDivisionError,
            "IndexError": IndexError,
            "KeyError": KeyError,
            "AttributeError": AttributeError,
            "RuntimeError": RuntimeError,
            "NameError": NameError,
            "ImportError": ImportError,
            "LookupError": LookupError,
            "ArithmeticError": ArithmeticError,
            "StopIteration": StopIteration,
            "AssertionError": AssertionError,
        }

        def disabled_input(*args, **kwargs):
            raise RuntimeError("קלט משתמש (input) אינו נתמך בסביבה זו. הגדר את הערך כמשתנה בקוד.")

        safe_builtins["input"] = disabled_input

        safe_env = {
            "__builtins__": safe_builtins,
            "__name__": "__main__",
            "math": math,
            "random": random,
            "json": json,
            "datetime": datetime,
            "string": string,
        }

        try:
            with contextlib.redirect_stdout(output_buffer):
                exec(code_str, safe_env)
            result_queue.put({
                "success": True,
                "output": output_buffer.getvalue(),
                "error": None
            })
        except Exception as e:
            import traceback
            error_lines = traceback.format_exception_only(type(e), e)
            raw_msg = "".join(error_lines).strip()
            result_queue.put({
                "success": False,
                "output": output_buffer.getvalue(),
                "error": translate_error(raw_msg)
            })

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        return {
            "success": False,
            "output": "",
            "error": translate_error("Timeout")
        }

    try:
        return result_queue.get_nowait()
    except queue.Empty:
        return {
            "success": False,
            "output": "",
            "error": "אירעה שגיאה בלתי צפויה בהרצה."
        }
