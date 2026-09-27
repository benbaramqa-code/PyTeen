import os
import sys
import json
import webbrowser
import threading
import http.server
import socketserver
from models.course_data import LESSONS, get_lesson_by_id
from utils.code_evaluator import run_user_code

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(CURRENT_DIR, "index.html")

MANIFEST_FILE = os.path.join(CURRENT_DIR, "manifest.json")
SW_FILE       = os.path.join(CURRENT_DIR, "service-worker.js")

class PyTeenHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            try:
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        elif self.path == "/api/lessons":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            data = [
                {
                    "id": l.id,
                    "chapter": l.chapter,
                    "title": l.title,
                    "recap": l.recap,
                    "why_learn": l.why_learn,
                    "when_to_use": l.when_to_use,
                    "explanation": l.explanation,
                    "tip": l.tip,
                    "default_code": l.default_code,
                    "expected_output": l.expected_output,
                    "hint": l.hint,
                    "success_message": l.success_message,
                    "gemini_prompt": l.get_gemini_prompt()
                }
                for l in LESSONS
            ]
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        elif self.path == "/manifest.json":
            try:
                with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/manifest+json; charset=utf-8")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        elif self.path == "/service-worker.js":
            try:
                with open(SW_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Service-Worker-Allowed", "/")
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/run":
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8")
            req = json.loads(raw_body)
            code = req.get("code", "")
            lesson_id = req.get("lesson_id", 1)

            lesson = get_lesson_by_id(lesson_id)
            eval_result = run_user_code(code)

            passed = False
            message = ""
            if eval_result["success"] and lesson:
                from utils.code_evaluator import normalize_output
                actual_norm = normalize_output(eval_result.get("output", ""))
                expected_norm = normalize_output(lesson.expected_output)
                if actual_norm == expected_norm:
                    passed = True
                    message = lesson.success_message + " 🎉"

            response = {
                "success": eval_result["success"],
                "output": eval_result.get("output", ""),
                "error": eval_result.get("error", ""),
                "passed": passed,
                "message": message,
                "expected": lesson.expected_output if lesson else ""
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        return

def find_free_port():
    env_port = os.environ.get("PORT")
    if env_port:
        return int(env_port)
    import socket
    for port in [8080, 8550, 5000, 8000]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return 8080

if __name__ == "__main__":
    is_cloud = "PORT" in os.environ
    port = find_free_port()
    host = "0.0.0.0" if is_cloud else "127.0.0.1"
    url = f"http://localhost:{port}"

    print("=" * 45)
    print("       Python Bekalut Web Server Running")
    print(f"       Host: {host} | Port: {port}")
    print(f"       URL: {url}")
    print("=" * 45)

    if not is_cloud:
        def open_browser():
            import time
            time.sleep(0.5)
            webbrowser.open(url)
            os.system(f"start {url}")

        threading.Thread(target=open_browser, daemon=True).start()

    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with ReusableTCPServer((host, port), PyTeenHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Server stopped.")
