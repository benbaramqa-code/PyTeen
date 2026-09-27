import flet as ft
from models.course_data import get_lesson_by_id, LESSONS
from utils.code_evaluator import run_user_code, normalize_output

def get_lesson_view(page: ft.Page, lesson_id: int):
    lesson = get_lesson_by_id(lesson_id)
    
    if not lesson:
        return ft.View("/lesson_not_found", [ft.Text("השיעור לא נמצא", color=ft.Colors.RED)])

    # רכיבי ממשק
    output_text = ft.Text(value="", color=ft.Colors.GREEN, font_family="Consolas")
    error_text = ft.Text(value="", color=ft.Colors.RED_ACCENT)
    
    code_input = ft.TextField(
        value=lesson.default_code,
        multiline=True,
        min_lines=8,
        max_lines=15,
        text_size=16,
        bgcolor=ft.Colors.BLUE_GREY_800,
        color=ft.Colors.WHITE,
        border_color=ft.Colors.BLUE_ACCENT,
        text_align=ft.TextAlign.LEFT, # פייתון נכתב משמאל לימין
        rtl=False
    )
    
    next_btn = ft.FilledButton(
        content="לשלב הבא!", 
        visible=False,
        bgcolor=ft.Colors.GREEN_600,
        color=ft.Colors.WHITE,
        on_click=lambda e: page.go(f"/lesson/{lesson_id + 1}")
    )

    def on_run_click(e):
        # ניקוי פלט קודם
        output_text.value = ""
        error_text.value = ""
        next_btn.visible = False
        page.update()
        
        # הרצת הקוד
        result = run_user_code(code_input.value)
        
        if result["success"]:
            # אם אין שגיאת פייתון, נבדוק אם הפלט תואם למה שביקשנו
            if normalize_output(result["output"]) == normalize_output(lesson.expected_output):
                output_text.value = f"פלט:\n{result['output']}\n\n{lesson.success_message} 🎉"
                output_text.color = ft.Colors.GREEN_ACCENT
                if lesson_id < len(LESSONS):
                    next_btn.visible = True
            else:
                output_text.value = f"הקוד עובד, אבל הפלט לא מדויק.\nפלט נוכחי:\n{result['output']}\nפלט מצופה:\n{lesson.expected_output}"
                output_text.color = ft.Colors.YELLOW_ACCENT
        else:
            # במקרה של שגיאת קוד
            error_text.value = f" ❌ {result['error']}"
            
        page.update()

    def go_back(e):
        page.go("/")

    return ft.View(
        f"/lesson/{lesson_id}",
        [
            # כפתור חזרה
            ft.Row([ft.IconButton(icon=ft.Icons.ARROW_BACK, icon_color=ft.Colors.WHITE, on_click=go_back)]),
            
            # כותרת והסבר
            ft.Text(value=lesson.title, size=32, color=ft.Colors.BLUE_ACCENT_200, weight=ft.FontWeight.BOLD),
            ft.Text(value=lesson.explanation, size=18, color=ft.Colors.WHITE),
            
            # קוביית טיפ
            ft.Container(
                content=ft.Text(value=lesson.tip, color=ft.Colors.BLACK, size=16, weight=ft.FontWeight.BOLD),
                bgcolor=ft.Colors.YELLOW_400,
                padding=15,
                border_radius=10,
                margin=ft.Margin.symmetric(vertical=10)
            ),

            # קוביית טעויות נפוצות
            ft.Container(
                content=ft.Column([
                    ft.Text(value="⚠️ טעויות נפוצות ודוגמאות שגיאה שכדאי להכיר:", color=ft.Colors.RED_200, size=15, weight=ft.FontWeight.BOLD),
                    ft.Text(value=getattr(lesson, "common_mistakes", ""), color=ft.Colors.WHITE, size=14)
                ]),
                bgcolor=ft.Colors.RED_900,
                padding=15,
                border_radius=10,
                margin=ft.Margin.symmetric(vertical=10)
            ) if getattr(lesson, "common_mistakes", "") else ft.Container(),
            
            # עורך קוד
            ft.Text(value="עורך קוד:", size=18, color=ft.Colors.WHITE_70),
            code_input,
            
            # כפתור הרצה
            ft.FilledButton(
                content="הרץ קוד ▶️", 
                on_click=on_run_click,
                bgcolor=ft.Colors.BLUE_ACCENT_700,
                color=ft.Colors.WHITE
            ),
            
            # אזור פלט והתקדמות
            ft.Container(height=20),
            output_text,
            error_text,
            next_btn
        ],
        bgcolor=ft.Colors.BLUE_GREY_900,
        scroll=ft.ScrollMode.AUTO,
        padding=30
    )
