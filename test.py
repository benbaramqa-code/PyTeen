import flet as ft
import traceback
from unittest.mock import Mock

p = Mock(spec=ft.Page)
p.route = '/'
p.views = []

try:
    from views.home_view import get_home_view
    v1 = get_home_view(p)
    print('Home OK')
except Exception as e:
    print('Error in home_view:')
    traceback.print_exc()

try:
    from views.lesson_view import get_lesson_view
    v2 = get_lesson_view(p, 1)
    print('Lesson OK')
except Exception as e:
    print('Error in lesson_view:')
    traceback.print_exc()
