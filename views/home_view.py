import flet as ft

def get_home_view(page: ft.Page):
    def on_start_click(e):
        page.go("/lesson/1")

    return ft.View(
        "/",
        [
            ft.Container(
                content=ft.Column(
                    [
                        ft.Icon(icon=ft.Icons.CODE, size=80, color=ft.Colors.GREEN_ACCENT_400),
                        ft.Text(
                            value="ברוכים הבאים ל-PyTeen!",
                            size=40,
                            color=ft.Colors.GREEN_ACCENT_400,
                            weight=ft.FontWeight.BOLD,
                            text_align=ft.TextAlign.CENTER,
                        ),
                        ft.Text(
                            value="האפליקציה שתלמד אותך לתכנת בפייתון מאפס, צעד אחר צעד.",
                            size=20,
                            color=ft.Colors.WHITE_70,
                            text_align=ft.TextAlign.CENTER,
                        ),
                        ft.Container(height=30), # מרווח
                        ft.FilledButton(
                            content="התחל לשחק וללמוד",
                            icon=ft.Icons.ROCKET_LAUNCH,
                            bgcolor=ft.Colors.PURPLE_600,
                            color=ft.Colors.WHITE,
                            style=ft.ButtonStyle(
                                padding=20,
                                text_style=ft.TextStyle(size=20, weight=ft.FontWeight.BOLD)
                            ),
                            on_click=on_start_click
                        )
                    ],
                    alignment=ft.MainAxisAlignment.CENTER,
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                ),
                alignment=ft.Alignment.CENTER,
                expand=True
            )
        ],
        bgcolor=ft.Colors.BLUE_GREY_900,
        vertical_alignment=ft.MainAxisAlignment.CENTER,
        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
    )
