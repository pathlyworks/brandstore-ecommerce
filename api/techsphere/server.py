"""TechSphere mock API - run it locally while you build the storefront.

    python server.py            # http://localhost:4010   (Python 3.9+, nothing to install)
    python server.py 5000       # another port

The endpoints are described in openapi.yaml. Sample data is written to fixtures/ when the server starts.
Test accounts: student@techsphere.test / Passw0rd! (shopper), admin@techsphere.test / Admin123! (admin).
"""
from __future__ import annotations
import base64
import json
import re
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"
CATEGORIES = [{"id": "laptops", "name": "Laptops", "name_ar": "لابتوب"}, {"id": "phones", "name": "Phones", "name_ar": "موبايلات"},
              {"id": "audio", "name": "Audio", "name_ar": "صوتيات"}, {"id": "smart-home", "name": "Smart home", "name_ar": "المنزل الذكي"}]
BRANDS = ["Nova", "Pulse", "Orbit", "Lumen"]
USERS = {"student@techsphere.test": {"password": "Passw0rd!", "name": "Test Student", "role": "shopper"},
         "admin@techsphere.test": {"password": "Admin123!", "name": "Admin", "role": "admin"}}


def build_products():
    out = []
    for i in range(24):
        cat = CATEGORIES[i % 4]["id"]
        price = [32999, 12499, 2499, 4999][i % 4] + (i // 4) * 1000
        p = {"id": f"p-{i + 1:03d}", "name": f"{BRANDS[i % 4]} {cat.title().replace('-', ' ')} {i + 1}",
             "name_ar": f"{['نوفا', 'بلس', 'أوربت', 'لومن'][i % 4]} {i + 1}", "brand": BRANDS[i % 4], "category": cat,
             "price": price, "currency": "EGP", "stock_status": ["in_stock", "low", "in_stock", "out_of_stock"][i % 4] if i % 7 else "in_stock",
             "rating": round(3 + (i % 5) * 0.5, 1), "reviews_count": 10 + i * 3, "images": [f"/images/p-{i + 1:03d}.webp"],
             "specs": {"warranty": "1 year"}}
        if i in (4, 13):
            p["price"] = f"EGP {price:,}"
        if i in (6, 17):
            p.pop("stock_status")
        if i in (9, 20):
            p["images"] = [f"/images/missing-{i}.webp"]
        out.append(p)
    return out


def build_orders():
    dates = ["2026-08-01T10:15:00Z", "02/08/2026", "2026-08-03T18:40:00+03:00", "4 Aug 2026"]
    return [{"id": f"o-{i + 1:03d}", "items": [{"productId": f"p-{i + 1:03d}", "qty": 1}], "total": 2499 + i * 100,
             "status": ["processing", "shipped", "delivered", "cancelled"][i % 4], "created_at": dates[i % 4]} for i in range(9)]


def price_number(p):
    v = p.get("price")
    return float(re.sub(r"[^\d.]", "", v)) if isinstance(v, str) else float(v)


class State:
    def __init__(self):
        self.reset()

    def reset(self):
        self.products = build_products()
        self.orders = build_orders()
        self.addresses = [{"id": "a-1", "city": "Cairo", "street": "90th Street"}, {"id": "a-2", "city": "Giza", "street": "Pyramids Rd"}]
        self.placed = []
        self.log = []
        self.fail = {}
        self.delay_ms = 0
        self.empty = False
        self.lock = threading.Lock()


def make_token(email, role, ttl=3600):
    body = base64.urlsafe_b64encode(json.dumps({"sub": email, "role": role, "exp": int(time.time()) + ttl}).encode()).decode().rstrip("=")
    return f"eyJhbGciOiJub25lIn0.{body}.mock"


def read_token(header):
    m = re.match(r"Bearer\s+(\S+)", header or "")
    if not m:
        return None
    try:
        part = m.group(1).split(".")[1]
        data = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
        return data if data["exp"] > time.time() else None
    except Exception:
        return None


class Handler(BaseHTTPRequestHandler):
    state: State = None
    controls = True                      # the grader's /__ endpoints; off when a learner runs the server

    def log_message(self, *a):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):          # the browser closed a page mid-response: not an error
            pass

    def _send(self, code, body=None, headers=None):
        raw = b"" if body is None else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin") or "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Content-Length", str(len(raw)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if raw:
            self.wfile.write(raw)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return None

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self): self._route("GET")
    def do_POST(self): self._route("POST")
    def do_PUT(self): self._route("PUT")
    def do_PATCH(self): self._route("PATCH")
    def do_DELETE(self): self._route("DELETE")

    def _route(self, method):
        st = self.state
        u = urllib.parse.urlparse(self.path)
        q = {k: v[-1] for k, v in urllib.parse.parse_qs(u.query).items()}
        path = u.path.rstrip("/") or "/"
        body = self._body() if method in ("POST", "PUT", "PATCH") else None
        if path.startswith("/__"):
            if not self.controls:
                return self._send(404, {"error": "Not found"})
            return self._control(method, path, body)
        with st.lock:
            st.log.append({"t": round(time.time(), 3), "method": method, "path": path, "query": q,
                           "auth": bool(self.headers.get("Authorization")), "body": body})
        if st.delay_ms:
            time.sleep(st.delay_ms / 1000)
        for pat, f in list(st.fail.items()):
            if re.fullmatch(pat, path) and f["times"] != 0:
                f["times"] -= 1
                return self._send(f["status"], {"error": "Forced failure", "status": f["status"]})
        if method == "GET" and path.startswith("/images/"):
            return self._send(404 if "missing" in path else 200, {"image": path})
        routes = [("GET", r"/categories", self.categories), ("GET", r"/products", self.products), ("GET", r"/products/([\w-]+)", self.product),
                  ("POST", r"/auth/register", self.register), ("POST", r"/auth/login", self.login),
                  ("GET", r"/account/orders", self.orders), ("PATCH", r"/account/orders/([\w-]+)/cancel", self.cancel),
                  ("GET", r"/account/addresses", self.addresses), ("PUT", r"/account/addresses/([\w-]+)", self.put_address),
                  ("DELETE", r"/account/addresses/([\w-]+)", self.delete_address), ("POST", r"/orders", self.place_order),
                  ("GET", r"/admin/summary", self.admin_summary)]
        for m, pat, fn in routes:
            mm = re.fullmatch(pat, path)
            if mm and m == method:
                return fn(q, body, *mm.groups())
            if mm and m != method and not any(re.fullmatch(p2, path) and m2 == method for m2, p2, _ in routes):
                return self._send(405, {"error": "Method not allowed"})
        self._send(404, {"error": "Not found"})

    # ---------------------------------------------------------------- control
    def _control(self, method, path, body):
        st = self.state
        if path == "/__reset":
            st.reset(); return self._send(200, {"ok": True})
        if path == "/__log":
            return self._send(200, {"requests": st.log, "orders_placed": st.placed})
        if path == "/__control" and method == "POST":
            body = body or {}
            if "fail" in body:
                f = body["fail"]; st.fail[f["path"]] = {"status": int(f.get("status", 500)), "times": int(f.get("times", -1))}
            if "clear_fail" in body:
                st.fail.clear()
            if "delay_ms" in body:
                st.delay_ms = int(body["delay_ms"])
            if "empty" in body:
                st.empty = bool(body["empty"])
            if "price" in body:
                for p in st.products:
                    if p["id"] == body["price"]["id"]:
                        p["price"] = body["price"]["price"]
            return self._send(200, {"ok": True})
        self._send(404, {"error": "unknown control"})

    # ---------------------------------------------------------------- catalog
    def _localize(self, p, q):
        if q.get("locale") == "ar":
            p = {**p, "name": p["name_ar"]}
        return {k: v for k, v in p.items() if k != "name_ar"}

    def categories(self, q, body):
        self._send(200, [{"id": c["id"], "name": c["name_ar"] if q.get("locale") == "ar" else c["name"]} for c in CATEGORIES])

    def products(self, q, body):
        items = [] if self.state.empty else list(self.state.products)
        if q.get("category"): items = [p for p in items if p["category"] == q["category"]]
        if q.get("brand"): items = [p for p in items if p["brand"].lower() == q["brand"].lower()]
        if q.get("search"): items = [p for p in items if q["search"].lower() in p["name"].lower()]
        try:
            if q.get("min_price"): items = [p for p in items if price_number(p) >= float(q["min_price"])]
            if q.get("max_price"): items = [p for p in items if price_number(p) <= float(q["max_price"])]
            if q.get("min_rating"): items = [p for p in items if p["rating"] >= float(q["min_rating"])]
            page = int(q.get("page", 1))
        except ValueError:
            return self._send(400, {"error": "Invalid query parameter"})
        sort = q.get("sort")
        if sort in ("price_asc", "price_desc"):
            items.sort(key=price_number, reverse=sort == "price_desc")
        elif sort == "rating":
            items.sort(key=lambda p: -p["rating"])
        elif sort:
            return self._send(400, {"error": f"Unknown sort '{sort}'"})
        size = 8
        total_pages = max(1, -(-len(items) // size))
        self._send(200, {"items": [self._localize(p, q) for p in items[(page - 1) * size: page * size]], "page": page,
                         "total_pages": total_pages, "total": len(items)})

    def product(self, q, body, pid):
        p = next((p for p in self.state.products if p["id"] == pid), None)
        self._send(200, self._localize(p, q)) if p else self._send(404, {"error": "Product not found"})

    # ---------------------------------------------------------------- auth + account
    def _user(self, admin=False):
        t = read_token(self.headers.get("Authorization"))
        if not t or (admin and t["role"] != "admin"):
            self._send(401 if not t else 403, {"error": "Unauthorized" if not t else "Forbidden"})
            return None
        return t

    def register(self, q, body):
        if not body or "@" not in str(body.get("email", "")) or len(str(body.get("password", ""))) < 8:
            return self._send(400, {"error": "Invalid email or password (min 8 characters)"})
        if body["email"] in USERS:
            return self._send(400, {"error": "Email already registered"})
        self._send(201, {"token": make_token(body["email"], "shopper"), "user": {"email": body["email"], "name": body.get("name", "")}})

    def login(self, q, body):
        u = USERS.get((body or {}).get("email"))
        if not u or u["password"] != (body or {}).get("password"):
            return self._send(401, {"error": "Invalid credentials"})
        self._send(200, {"token": make_token(body["email"], u["role"]), "user": {"email": body["email"], "name": u["name"], "role": u["role"]}})

    def orders(self, q, body):
        if not self._user():
            return
        off, lim = int(q.get("offset", 0)), int(q.get("limit", 5))
        self._send(200, {"items": self.state.orders[off: off + lim], "offset": off, "limit": lim, "total": len(self.state.orders)})

    def cancel(self, q, body, oid):
        if not self._user():
            return
        o = next((o for o in self.state.orders if o["id"] == oid), None)
        if not o:
            return self._send(404, {"error": "Order not found"})
        if o["status"] in ("shipped", "delivered", "cancelled"):
            return self._send(409, {"error": f"Order is {o['status']}"})
        o["status"] = "cancelled"
        self._send(200, o)

    def addresses(self, q, body):
        if self._user():
            self._send(200, self.state.addresses)

    def put_address(self, q, body, aid):
        if not self._user():
            return
        if not body or not body.get("city"):
            return self._send(400, {"error": "city is required"})
        for a in self.state.addresses:
            if a["id"] == aid:
                a.update(body); return self._send(200, a)
        self._send(404, {"error": "Address not found"})

    def delete_address(self, q, body, aid):
        if not self._user():
            return
        self.state.addresses = [a for a in self.state.addresses if a["id"] != aid]
        self._send(204)

    def place_order(self, q, body):
        if not self._user():
            return
        if not body or not body.get("items"):
            return self._send(400, {"error": "items are required"})
        self.state.placed.append(body)
        self._send(201, {"id": f"o-{100 + len(self.state.placed)}", "number": f"TS-{1000 + len(self.state.placed)}", "status": "processing"})

    def admin_summary(self, q, body):
        if not self._user(admin=True):
            return
        prods = self.state.products
        self._send(200, {"revenue": sum(o["total"] for o in self.state.orders if o["status"] != "cancelled"),
                         "orders": len(self.state.orders), "products": len(prods),
                         "out_of_stock": sum(p.get("stock_status") == "out_of_stock" for p in prods), "currency": "EGP",
                         "note": "Revenue is gross sales, not profit"})


class MockAPI:
    def __init__(self, port: int = 0, host: str = "127.0.0.1", controls: bool = True):
        """host 0.0.0.0 only when the app runs in Docker on Linux (it reaches the host through the Docker bridge).
        controls=False: the learner's copy, without the grader's /__control, /__reset and /__log endpoints."""
        self.state = State()
        handler = type("H", (Handler,), {"state": self.state, "controls": controls})
        self.server = ThreadingHTTPServer((host, port), handler)
        self.server.daemon_threads = True
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    # helpers used by checks
    def control(self, **kw):
        import urllib.request
        req = urllib.request.Request(self.url + "/__control", data=json.dumps(kw).encode(), method="POST",
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5).read()

    def requests(self):
        return list(self.state.log)

    def clear_log(self):
        with self.state.lock:
            self.state.log.clear()


def write_fixtures():
    FIXTURES.mkdir(parents=True, exist_ok=True)
    (FIXTURES / "products.json").write_text(json.dumps(build_products(), ensure_ascii=False, indent=1), encoding="utf-8")
    (FIXTURES / "orders.json").write_text(json.dumps(build_orders(), indent=1), encoding="utf-8")
    (FIXTURES / "categories.json").write_text(json.dumps(CATEGORIES, ensure_ascii=False, indent=1), encoding="utf-8")
    (FIXTURES / "users.json").write_text(json.dumps({k: {"password": v["password"], "role": v["role"]} for k, v in USERS.items()}, indent=1),
                                         encoding="utf-8")


if __name__ == "__main__":
    import sys
    write_fixtures()
    port = next((int(a) for a in sys.argv[1:] if a.isdigit()), 4010)
    api = MockAPI(port, controls="--grader" in sys.argv)
    print(f"TechSphere mock API on {api.url}  (Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        api.stop()
