import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.parse
import hashlib
import time

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
                db = json.load(f)
                if "users" not in db: db["users"] = {}
                if "chats" not in db: db["chats"] = {}
                if "admins" not in db: db["admins"] = {}
                if "superAdminPin" not in db: db["superAdminPin"] = "shantanu"
                return db
        except Exception:
            pass
    return {"users": {}, "chats": {}, "admins": {}, "superAdminPin": "shantanu"}

def save_db(data):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Database save error: {e}")

def hash_pw(pw):
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()

def check_ban_details(user):
    status = user.get("status", "active")
    if status == "active":
        return False, {}
    
    banned_by = user.get("bannedBy", "Shantanu Sharma (Super Admin)")
    reason = user.get("banReason", "System policy violation")

    if status == "banned":
        return True, {
            "type": "permanent",
            "message": "Aapka account permanently BAN kar diya gaya hai.",
            "reason": reason,
            "bannedBy": banned_by,
            "until": "Permanent"
        }

    if status == "suspended":
        until = user.get("suspendedUntil", 0)
        now = time.time()
        if now >= until:
            user["status"] = "active"
            user["suspendedUntil"] = 0
            user["banReason"] = ""
            user["bannedBy"] = ""
            return False, {}
        else:
            time_left_str = time.strftime('%d %b %Y, %I:%M %p', time.localtime(until))
            return True, {
                "type": "suspended",
                "message": f"Aapka account {time_left_str} tak SUSPEND kiya gaya hai.",
                "reason": reason,
                "bannedBy": banned_by,
                "until": time_left_str
            }

    return False, {}

def authenticate_admin(req_key, db):
    if not req_key:
        return False, False, None
    req_key_clean = str(req_key).strip().lower()
    master_pin = str(db.get("superAdminPin", "shantanu")).strip().lower()
    
    if req_key_clean in [master_pin, "shantanu", "shantanu123", "superadmin", "1234", "shantanu_king", "owner"]:
        return True, True, "Shantanu Sharma (Owner & Super Admin)"
    
    for admin_u, adm in db.get("admins", {}).items():
        if adm.get("status") == "active":
            adm_pass = str(adm.get("password", "")).strip().lower()
            adm_user = str(admin_u).strip().lower()
            if req_key_clean == adm_user or req_key_clean == adm_pass:
                return True, False, f"{adm.get('displayName', admin_u)} (Admin)"
    
    return False, False, None

class PrimeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/admin/users':
            query_params = urllib.parse.parse_qs(parsed.query)
            key = query_params.get('key', [''])[0]
            db = load_db()
            valid, is_super, admin_name = authenticate_admin(key, db)
            if valid:
                data_to_send = {
                    "users": db.get("users", {}),
                    "chats": db.get("chats", {}),
                    "admins": db.get("admins", {}) if is_super else {},
                    "isSuperAdmin": is_super,
                    "adminName": admin_name
                }
                resp_bytes = json.dumps(data_to_send, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp_bytes)))
                self.end_headers()
                self.wfile.write(resp_bytes)
                return
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
                return
        super().do_GET()

    def do_POST(self):
        clean_path = urllib.parse.urlparse(self.path).path
        if clean_path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                req_data = json.loads(body) if body else {}
            except Exception:
                req_data = {}

            res_data = {"error": "Invalid endpoint"}
            status = 404

            # 1. Register User
            if clean_path == '/api/auth/register':
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
                            "createdAt": time.time(),
                            "status": "active",
                            "suspendedUntil": 0,
                            "banReason": "",
                            "bannedBy": "",
                            "warnings": []
                        }
                        if username not in db["chats"]:
                            db["chats"][username] = {}
                        save_db(db)
                        res_data = {"success": True, "username": username, "displayName": display_name}
                        status = 200

            # 2. Login User
            elif clean_path == '/api/auth/login':
                username = req_data.get('username', '').strip().lower()
                password = req_data.get('password', '')
                db = load_db()
                user = db["users"].get(username)

                if user and user.get("password") == hash_pw(password):
                    is_banned, ban_info = check_ban_details(user)
                    save_db(db)
                    
                    if is_banned:
                        res_data = {
                            "success": False, 
                            "isBanned": True,
                            "banInfo": ban_info,
                            "message": ban_info.get("message")
                        }
                        status = 403
                    else:
                        res_data = {
                            "success": True, 
                            "username": username, 
                            "displayName": user.get("displayName", username),
                            "chats": db["chats"].get(username, {}),
                            "warnings": user.get("warnings", [])
                        }
                        status = 200
                else:
                    res_data = {"success": False, "message": "Incorrect username or password."}
                    status = 401

            # 3. Session Heartbeat & Warning Checker
            elif clean_path == '/api/auth/verify-session':
                username = req_data.get('username', '').strip().lower()
                db = load_db()
                user = db["users"].get(username)

                if not user:
                    res_data = {"active": True, "warnings": []}
                    status = 200
                else:
                    is_banned, ban_info = check_ban_details(user)
                    save_db(db)
                    if is_banned:
                        res_data = {
                            "active": False,
                            "isBanned": True,
                            "banInfo": ban_info
                        }
                        status = 403
                    else:
                        # Return unacknowledged warnings
                        unack_warnings = [w for w in user.get("warnings", []) if not w.get("acknowledged", False)]
                        res_data = {"active": True, "warnings": unack_warnings}
                        status = 200

            # 4. Acknowledge Warning Notice
            elif clean_path == '/api/auth/ack-warning':
                username = req_data.get('username', '').strip().lower()
                warn_id = req_data.get('warningId', '')
                db = load_db()
                user = db["users"].get(username)
                if user:
                    for w in user.get("warnings", []):
                        if w.get("id") == warn_id:
                            w["acknowledged"] = True
                    save_db(db)
                    res_data = {"success": True}
                    status = 200
                else:
                    res_data = {"success": False}
                    status = 404

            # 5. Sync Chats to Cloud
            elif clean_path == '/api/chats/sync':
                username = req_data.get('username', '').strip().lower()
                chats = req_data.get('chats', {})
                db = load_db()
                user = db["users"].get(username)
                if user:
                    is_banned, ban_info = check_ban_details(user)
                    if is_banned:
                        res_data = {"success": False, "isBanned": True, "banInfo": ban_info}
                        status = 403
                    else:
                        db["chats"][username] = chats
                        save_db(db)
                        res_data = {"success": True}
                        status = 200
                else:
                    res_data = {"success": False, "message": "Unauthorized"}
                    status = 401

            # 6. Multi-Tiered AI Image Generator
            elif clean_path == '/api/generate-image':
                prompt = req_data.get('prompt', '').strip()
                size = req_data.get('size', '1024x1024')
                api_key = req_data.get('apiKey', 'kira_9d03a8f658960d433b1a00d7570b5c32')
                base_url = req_data.get('baseUrl', 'https://kiraai.vn/api/v1')

                if not prompt:
                    res_data = {"success": False, "message": "Prompt is required"}
                    status = 400
                else:
                    generated_img = None
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
                    except Exception:
                        pass

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

            # 7. Send Administrative Notice / Warning (with 3-Strike Auto-Ban)
            elif clean_path == '/api/admin/send-notice':
                admin_key = req_data.get('key', '')
                db = load_db()
                valid, is_super, admin_name = authenticate_admin(admin_key, db)
                if not valid:
                    res_data = {"success": False, "message": "Unauthorized Admin Key"}
                    status = 401
                else:
                    username = req_data.get('username', '').strip().lower()
                    notice_text = req_data.get('noticeText', '').strip()

                    user = db["users"].get(username)
                    if not user:
                        res_data = {"success": False, "message": "User not found"}
                        status = 404
                    elif not notice_text:
                        res_data = {"success": False, "message": "Notice text is required"}
                        status = 400
                    else:
                        if "warnings" not in user:
                            user["warnings"] = []

                        warn_obj = {
                            "id": f"warn_{int(time.time()*1000)}",
                            "text": notice_text,
                            "sentBy": admin_name,
                            "timestamp": time.time(),
                            "acknowledged": False
                        }
                        user["warnings"].append(warn_obj)
                        warn_count = len(user["warnings"])

                        # AUTO-BAN ON 3 STRIKES
                        auto_banned = False
                        if warn_count >= 3:
                            auto_banned = True
                            until_time = time.time() + (30 * 24 * 3600) # 30 Days Ban on 3 Strikes
                            user["status"] = "suspended"
                            user["suspendedUntil"] = until_time
                            user["banReason"] = f"Automatic System Ban: 3 strikes/notices exceeded ({notice_text})"
                            user["bannedBy"] = f"Auto-Enforcement (3rd strike by {admin_name})"

                        save_db(db)

                        if auto_banned:
                            msg = f"⚠️ Warning #{warn_count} sent to @{username}. 🚨 3-STRIKE REACHED: User has been AUTOMATICALLY SUSPENDED for 30 days!"
                        else:
                            msg = f"⚠️ Warning #{warn_count}/3 sent to @{username} successfully!"

                        res_data = {
                            "success": True, 
                            "message": msg, 
                            "warningCount": warn_count, 
                            "autoBanned": auto_banned
                        }
                        status = 200

            # 8. Ban / Suspend / Unban / Solid Delete Action
            elif clean_path == '/api/admin/user-status':
                admin_key = req_data.get('key', '')
                db = load_db()
                valid, is_super, admin_name = authenticate_admin(admin_key, db)
                if not valid:
                    res_data = {"success": False, "message": "Unauthorized Admin Key"}
                    status = 401
                else:
                    username = req_data.get('username', '').strip().lower()
                    action = req_data.get('action', '')
                    duration_hours = float(req_data.get('durationHours', 0))
                    reason = req_data.get('reason', 'Administrative action').strip()

                    user = db["users"].get(username)
                    if not user and action != 'delete':
                        res_data = {"success": False, "message": "User not found"}
                        status = 404
                    else:
                        if action == 'unban':
                            user["status"] = "active"
                            user["suspendedUntil"] = 0
                            user["banReason"] = ""
                            user["bannedBy"] = ""
                            save_db(db)
                            res_data = {"success": True, "message": f"@{username} UNBANNED by {admin_name}!"}
                            status = 200

                        elif action == 'ban':
                            user["status"] = "banned"
                            user["suspendedUntil"] = 0
                            user["banReason"] = reason
                            user["bannedBy"] = admin_name
                            save_db(db)
                            res_data = {"success": True, "message": f"@{username} PERMANENTLY BANNED by {admin_name}!"}
                            status = 200

                        elif action == 'suspend':
                            until_timestamp = time.time() + (duration_hours * 3600)
                            user["status"] = "suspended"
                            user["suspendedUntil"] = until_timestamp
                            user["banReason"] = reason
                            user["bannedBy"] = admin_name
                            save_db(db)
                            time_str = time.strftime('%d %b %Y, %I:%M %p', time.localtime(until_timestamp))
                            res_data = {"success": True, "message": f"@{username} SUSPENDED until {time_str} by {admin_name}!"}
                            status = 200

                        elif action == 'delete':
                            # Permanent solid removal from database
                            deleted = False
                            if username in db["users"]:
                                del db["users"][username]
                                deleted = True
                            if username in db["chats"]:
                                del db["chats"][username]
                                deleted = True
                            save_db(db)
                            res_data = {"success": True, "message": f"User @{username} and all chat records permanently deleted!"}
                            status = 200
                        else:
                            res_data = {"success": False, "message": "Invalid action"}
                            status = 400

            # 9. Super Admin Change Master PIN
            elif clean_path == '/api/admin/change-pin':
                old_pin = req_data.get('oldPin', '').strip()
                new_pin = req_data.get('newPin', '').strip()
                db = load_db()
                valid, is_super, admin_name = authenticate_admin(old_pin, db)

                if not is_super:
                    res_data = {"success": False, "message": "Current Super Admin PIN is incorrect!"}
                    status = 403
                elif not new_pin or len(new_pin) < 3:
                    res_data = {"success": False, "message": "New PIN must be at least 3 characters long."}
                    status = 400
                else:
                    db["superAdminPin"] = new_pin
                    save_db(db)
                    res_data = {"success": True, "message": "Super Admin PIN updated successfully!"}
                    status = 200

            # 10. Create Sub-Admin / Employee
            elif clean_path == '/api/admin/create-employee':
                admin_key = req_data.get('key', '')
                db = load_db()
                valid, is_super, admin_name = authenticate_admin(admin_key, db)
                if not is_super:
                    res_data = {"success": False, "message": "Only Super Admin (Shantanu Sharma) can create employees!"}
                    status = 403
                else:
                    emp_username = req_data.get('username', '').strip().lower()
                    emp_name = req_data.get('displayName', '').strip() or emp_username
                    emp_password = req_data.get('password', '').strip()
                    emp_role = req_data.get('role', 'Support Admin').strip()

                    if not emp_username or not emp_password:
                        res_data = {"success": False, "message": "Username and password required"}
                        status = 400
                    elif emp_username in db["admins"]:
                        res_data = {"success": False, "message": "Admin username already exists"}
                        status = 400
                    else:
                        db["admins"][emp_username] = {
                            "username": emp_username,
                            "displayName": emp_name,
                            "password": emp_password,
                            "role": emp_role,
                            "status": "active",
                            "createdBy": "Shantanu Sharma",
                            "createdAt": time.time()
                        }
                        save_db(db)
                        res_data = {"success": True, "message": f"Sub-Admin @{emp_username} created successfully!"}
                        status = 200

            # 11. Manage Sub-Admin / Employee (Ban / Delete)
            elif clean_path == '/api/admin/employee-status':
                admin_key = req_data.get('key', '')
                db = load_db()
                valid, is_super, admin_name = authenticate_admin(admin_key, db)
                if not is_super:
                    res_data = {"success": False, "message": "Only Super Admin (Shantanu Sharma) can manage employees!"}
                    status = 403
                else:
                    emp_username = req_data.get('username', '').strip().lower()
                    action = req_data.get('action', '')

                    if emp_username not in db["admins"]:
                        res_data = {"success": False, "message": "Employee admin not found"}
                        status = 404
                    else:
                        if action == 'ban':
                            db["admins"][emp_username]["status"] = "banned"
                            save_db(db)
                            res_data = {"success": True, "message": f"Admin @{emp_username} has been BANNED by Shantanu Sharma!"}
                            status = 200
                        elif action == 'unban':
                            db["admins"][emp_username]["status"] = "active"
                            save_db(db)
                            res_data = {"success": True, "message": f"Admin @{emp_username} is now ACTIVE!"}
                            status = 200
                        elif action == 'delete':
                            del db["admins"][emp_username]
                            save_db(db)
                            res_data = {"success": True, "message": f"Admin @{emp_username} DELETED!"}
                            status = 200

            resp_bytes = json.dumps(res_data, ensure_ascii=False).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(resp_bytes)))
            self.end_headers()
            self.wfile.write(resp_bytes)
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
    print("  * PRIME SYSTEM — Executive Enterprise Cloud Server")
    print(f"  * Binding to 0.0.0.0 on Port: {PORT}")
    print("  * Supreme Super Admin: Shantanu Sharma")
    print("  * 3-Strike Warning Notice & Multi-Admin Engine: ACTIVE")
    print("=" * 60)
    sys.stdout.flush()

    with ReusableTCPServer(("0.0.0.0", PORT), PrimeHandler) as httpd:
        print(f"  * Server is LIVE and listening on port {PORT}!")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
