import json
import re
import webbrowser
from collections.abc import Sequence
from dataclasses import asdict
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from dishes import (
    APP_DIR,
    MEAL_LABELS,
    RESULTS_DIR,
    ROOT,
    DeckError,
    Dish,
    RawResult,
    answered,
    load_dishes,
    merge,
    pairs,
    parse_name,
    result_json,
)

WEB_DIR = APP_DIR / "web"
KINDS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".jpg": "image/jpeg",
}
PAGES = {
    "/": WEB_DIR / "index.html",
    "/app.js": WEB_DIR / "app.js",
    "/style.css": WEB_DIR / "style.css",
}


def deck_json(dishes: Sequence[Dish]) -> list[dict[str, str]]:
    return [
        {
            "id": dish.id,
            "name": dish.name,
            "caption": dish.caption,
            "tag": f"{dish.cuisine} · {MEAL_LABELS[dish.meal]}",
            "photo": f"/photos/{dish.id}.jpg",
            "credit": f"{dish.photo.author}, {dish.photo.license}",
            "source": dish.photo.source,
        }
        for dish in dishes
    ]


def save_result(name: str, document: dict[str, object], finished: datetime) -> Path:
    slug = re.sub(r"\W+", "-", name.lower()).strip("-")
    path = RESULTS_DIR / f"{finished:%Y-%m-%d-%H%M%S}-{slug}.json"
    RESULTS_DIR.mkdir(exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    return path


def handler_for(dishes: Sequence[Dish]) -> type[BaseHTTPRequestHandler]:
    deck = deck_json(dishes)
    files = PAGES | {f"/photos/{dish.id}.jpg": dish.photo.path for dish in dishes}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            url = urlsplit(self.path)
            if url.path == "/api/deck":
                self.send_json(deck)
            elif url.path == "/api/answered":
                self.send_answered(parse_qs(url.query).get("name", [""])[0])
            elif url.path == "/api/pairs":
                self.send_pairs()
            elif url.path in files:
                path = files[url.path]
                self.send_body(path.read_bytes(), KINDS[path.suffix], HTTPStatus.OK)
            else:
                self.send_json({"error": "не найдено"}, HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:
            if self.path != "/api/result":
                self.send_json({"error": "не найдено"}, HTTPStatus.NOT_FOUND)
                return
            body = self.rfile.read(int(self.headers["Content-Length"]))
            try:
                raw: RawResult = json.loads(body)
                result = merge(parse_name(raw["name"]), raw["answers"], dishes)
            except (DeckError, ValueError, KeyError) as err:
                self.send_json({"error": str(err)}, HTTPStatus.BAD_REQUEST)
                return
            finished = datetime.now(UTC).astimezone()
            document = result_json(result, finished, dishes)
            path = save_result(result.name, document, finished)
            self.send_json({"file": str(path.relative_to(ROOT))})

        def send_answered(self, raw_name: str) -> None:
            try:
                name = parse_name(raw_name)
            except DeckError as err:
                self.send_json({"error": str(err)}, HTTPStatus.BAD_REQUEST)
                return
            self.send_json(answered(name, dishes))

        def send_pairs(self) -> None:
            try:
                found = pairs(dishes)
            except DeckError as err:
                self.send_json({"error": str(err)}, HTTPStatus.INTERNAL_SERVER_ERROR)
                return
            self.send_json([asdict(p) for p in found])

        def send_json(
            self, payload: object, status: HTTPStatus = HTTPStatus.OK
        ) -> None:
            self.send_body(
                json.dumps(payload, ensure_ascii=False).encode(),
                "application/json; charset=utf-8",
                status,
            )

        def send_body(self, body: bytes, kind: str, status: HTTPStatus) -> None:
            self.send_response(status)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:  # noqa: A002
            return

    return Handler


def main() -> int:
    handler = handler_for(load_dishes())
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        url = f"http://127.0.0.1:{server.server_address[1]}/"
        print(
            f"Анкета открыта: {url}\nОтветы сохраняются в {RESULTS_DIR.relative_to(ROOT)}/. Остановить — Ctrl+C."
        )
        webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
