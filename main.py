import os
import sys
import json
import mimetypes
import webbrowser
import threading
import http.server
import socketserver
from urllib.parse import unquote
from models.course_data import LESSONS, get_lesson_by_id
from utils.code_evaluator import run_user_code, normalize_output

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(CURRENT_DIR, "index.html")

MIME_OVERRIDES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
}

class PyTeenHandler(http.server.BaseHTTPRequestHandler):
    def serve_file(self, file_path, content_type=None, extra_headers=None):
        if not os.path.isfile(file_path):
            self.send_error(404, "File Not Found")
            return

        if not content_type:
            ext = os.path.splitext(file_path)[1].lower()
            content_type = MIME_OVERRIDES.get(ext) or mimetypes.guess_type(file_path)[0] or "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            if extra_headers:
                for k, v in extra_headers.items():
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Internal Error: {e}")

    def do_GET(self):
        clean_path = unquote(self.path.split("?")[0].split("#")[0])

        if clean_path in ("/", "/index.html"):
            self.serve_file(INDEX_FILE)
            return

        if clean_path == "/api/lessons":
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
            return

        if clean_path == "/service-worker.js":
            sw_path = os.path.join(CURRENT_DIR, "service-worker.js")
            self.serve_file(sw_path, extra_headers={"Service-Worker-Allowed": "/"})
            return

        if clean_path == "/manifest.json":
            manifest_path = os.path.join(CURRENT_DIR, "manifest.json")
            self.serve_file(manifest_path, content_type="application/manifest+json; charset=utf-8")
            return

        # Serve static assets and icons safely with path traversal protection
        if clean_path.startswith("/static/") or clean_path.startswith("/icons/"):
            rel_path = clean_path.lstrip("/")
            target_path = os.path.abspath(os.path.join(CURRENT_DIR, rel_path))
            if target_path.startswith(CURRENT_DIR) and os.path.isfile(target_path):
                self.serve_file(target_path)
                return

        self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path == "/api/run":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(length).decode("utf-8")
                req = json.loads(raw_body)
                code = req.get("code", "")
                lesson_id = req.get("lesson_id", 1)

                lesson = get_lesson_by_id(lesson_id)
                eval_result = run_user_code(code)

                passed = False
                message = ""
                if eval_result.get("success") and lesson:
                    actual_norm = normalize_output(eval_result.get("output", ""))
                    expected_norm = normalize_output(lesson.expected_output)
                    if actual_norm == expected_norm:
                        passed = True
                        message = lesson.success_message + " 🎉"

                response = {
                    "success": eval_result.get("success", False),
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
            except Exception as e:
                self.send_error(500, f"Execution failed: {e}")
        else:
            self.send_error(404, "Not Found")

    def log_message(self, format, *args):
        return

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

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

    with ReusableTCPServer((host, port), PyTeenHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Server stopped.")

