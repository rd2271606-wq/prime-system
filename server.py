import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.parse
import hashlib
import time

# Ensure UTF-8 output and flush
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = int(os.environ.get("PORT", 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DIRECTORY, "prime_database.json")

def load_db():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"users": {}, "chats": {}}

def save_db(data):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Database save warning: {e}")

def hash_pw(pw):
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()

class PrimeHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/admin/users':
            query_params = urllib.parse.parse_qs(parsed.query)
            key = query_params.get('key', [''])[0]
            if key in ['shantanu', 'shantanu123', '1234']:
                db = load_db()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(db, ensure_ascii=False).encode('utf-8'))
                return
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
                return
        super().do_GET()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                req_data = json.loads(body) if body else {}
            except Exception:
                req_data = {}

            res_data = {"error": "Invalid endpoint"}
            status = 404

            # 1. Register User
            if self.path == '/api/auth/register':
                username = req_data.get('username', '').strip().lower()
                display_name = req_data.get('username', '').strip()
                password = req_data.get('password', '')

                if not username or not password:
                    res_data = {"success": False, "message": "Username and password required."}
                    status = 400
                else:
                    db = load_db()
                    if username in db["users"]:
                        res_data = {"success": False, "message": "Username already exists. Please choose another."}
                        status = 400
                    else:
                        db["users"][username] = {
                            "username": username,
                            "displayName": display_name,
                            "password": hash_pw(password),
                            "createdAt": time.time()
                        }
                        if username not in db["chats"]:
                            db["chats"][username] = {}
                        save_db(db)
                        res_data = {"success": True, "username": username, "displayName": display_name}
                        status = 200

            # 2. Login User
            elif self.path == '/api/auth/login':
                username = req_data.get('username', '').strip().lower()
                password = req_data.get('password', '')
                db = load_db()
                user = db["users"].get(username)

                if user and user.get("password") == hash_pw(password):
                    res_data = {
                        "success": True, 
                        "username": username, 
                        "displayName": user.get("displayName", username),
                        "chats": db["chats"].get(username, {})
                    }
                    status = 200
                else:
                    res_data = {"success": False, "message": "Incorrect username or password."}
                    status = 401

            # 3. Sync Chats to Cloud
            elif self.path == '/api/chats/sync':
                username = req_data.get('username', '').strip().lower()
                chats = req_data.get('chats', {})
                db = load_db()
                if username in db["users"]:
                    db["chats"][username] = chats
                    save_db(db)
                    res_data = {"success": True}
                    status = 200
                else:
                    res_data = {"success": False, "message": "Unauthorized"}
                    status = 401

            # 4. Multi-Tiered AI Image Generator
            elif self.path == '/api/generate-image':
                prompt = req_data.get('prompt', '').strip()
                size = req_data.get('size', '1024x1024')
                api_key = req_data.get('apiKey', 'kira_1a3bdff06cd7b63cfe008c6a393ef7d8')
                base_url = req_data.get('baseUrl', 'https://kiraai.vn/api/v1')

                if not prompt:
                    res_data = {"success": False, "message": "Prompt is required"}
                    status = 400
                else:
                    generated_img = None
                    # Attempt 1: Kira 3.0 Image
                    try:
                        payload = {
                            "model": "kira-3.0-image",
                            "prompt": prompt,
                            "n": 1,
                            "size": size
                        }
                        img_req = urllib.request.Request(
                            f"{base_url}/images/generations",
                            data=json.dumps(payload).encode('utf-8'),
                            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                        )
                        with urllib.request.urlopen(img_req, timeout=10) as resp:
                            img_data = json.loads(resp.read().decode('utf-8'))
                            items = img_data.get("data", [])
                            if len(items) > 0:
                                b64 = items[0].get("b64_json") or items[0].get("url")
                                if b64:
                                    generated_img = b64 if (b64.startswith("data:") or b64.startswith("http")) else f"data:image/png;base64,{b64}"
                    except Exception as e:
                        pass

                    # Attempt 2: High-Speed HD Fallback
                    if not generated_img:
                        try:
                            encoded_prompt = urllib.parse.quote(prompt)
                            fallback_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={int(time.time())}&model=flux"
                            generated_img = fallback_url
                        except Exception:
                            pass

                    if generated_img:
                        res_data = {"success": True, "imageUrl": generated_img}
                        status = 200
                    else:
                        res_data = {"success": False, "message": "Failed to render image."}
                        status = 500

            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(res_data).encode('utf-8'))
            return

        super().do_POST()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run_server():
    print("=" * 60)
    print("  * PRIME SYSTEM — Executive Cloud Server Initializing...")
    print(f"  * Binding to 0.0.0.0 on Port: {PORT}")
    print("  * Creator & Owner: Shantanu Sharma")
    print("=" * 60)
    sys.stdout.flush()

    with ReusableTCPServer(("0.0.0.0", PORT), PrimeHandler) as httpd:
        print(f"  * Server is LIVE and listening on port {PORT}!")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
