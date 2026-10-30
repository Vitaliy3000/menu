import json
import re
import webbrowser
from dataclasses import asdict
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import TypedDict

from deck import APP_DIR, ROOT, Deck, DeckError, Labels, load_deck, load_labels
from scoring import Answer, Profile, Swipe, build_profile
from summary import Section, summarize

RESULTS_DIR = ROOT / "taste-results"
WEB_DIR = APP_DIR / "web"
STATIC: dict[str, tuple[str, str]] = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
}


class ResultError(Exception):
    pass


class RawSwipe(TypedDict):
    shot: str
    answer: str
    ms: int


class RawResult(TypedDict):
    name: str
    swipes: list[RawSwipe]


def deck_json(deck: Deck) -> list[dict[str, str]]:
    return [
        {
            "id": shot.id,
            "name": shot.card.name,
            "caption": shot.card.caption,
            "photo": f"/photos/{shot.id}.jpg",
            "credit": f"{shot.photo.author}, {shot.photo.license}",
            "source": shot.photo.source,
        }
        for shot in deck.shots
    ]


def parse_result(raw: RawResult, deck: Deck) -> tuple[str, list[Swipe]]:
    name = raw["name"].strip()
    if not name:
        raise ResultError("нет имени")
    swipes = [
        Swipe(deck.shot(s["shot"]), Answer(s["answer"]), s["ms"]) for s in raw["swipes"]
    ]
    if sorted(s.shot.id for s in swipes) != sorted(shot.id for shot in deck.shots):
        raise ResultError("нужен ровно один ответ на каждую карточку")
    return name, swipes


def result_json(
    name: str, finished: datetime, profile: Profile, sections: tuple[Section, ...]
) -> dict[str, object]:
    return {
        "name": name,
        "finished": finished.isoformat(timespec="seconds"),
        "answers": [
            {
                "card": s.card.id,
                "presentation": s.shot.presentation,
                "name": s.card.name,
                "foods": [food.id for food in s.card.foods],
                "answer": s.answer,
                "ms": s.ms,
            }
            for s in (*profile.swipes, *profile.home)
        ],
        "novelty": profile.novelty,
        "traits": [
            {
                "facet": t.facet,
                "key": t.key,
                "likes": t.tally.likes,
                "dislikes": t.tally.dislikes,
                "unknown": t.tally.unknown,
            }
            for t in profile.traits
        ],
        "summary": [asdict(section) for section in sections],
    }


def save_result(name: str, document: dict[str, object], finished: datetime) -> Path:
    slug = re.sub(r"\W+", "-", name.lower()).strip("-")
    path = RESULTS_DIR / f"{finished:%Y-%m-%d-%H%M%S}-{slug}.json"
    RESULTS_DIR.mkdir(exist_ok=True)
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    return path


def handler_for(deck: Deck, labels: Labels) -> type[BaseHTTPRequestHandler]:
    photos = {f"/photos/{shot.id}.jpg": shot.photo.path for shot in deck.shots}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path == "/api/deck":
                self.send_json(deck_json(deck))
            elif self.path in STATIC:
                file, kind = STATIC[self.path]
                self.send_file(WEB_DIR / file, kind)
            elif self.path in photos:
                self.send_file(photos[self.path], "image/jpeg")
            else:
                self.send_json({"error": "не найдено"}, HTTPStatus.NOT_FOUND)

        def do_POST(self) -> None:
            if self.path != "/api/result":
                self.send_json({"error": "не найдено"}, HTTPStatus.NOT_FOUND)
                return
            body = self.rfile.read(int(self.headers["Content-Length"]))
            try:
                name, swipes = parse_result(json.loads(body), deck)
            except (ResultError, DeckError, ValueError, KeyError) as err:
                self.send_json({"error": str(err)}, HTTPStatus.BAD_REQUEST)
                return
            profile = build_profile(swipes)
            sections = summarize(profile, deck, labels)
            finished = datetime.now(UTC).astimezone()
            path = save_result(
                name, result_json(name, finished, profile, sections), finished
            )
            self.send_json(
                {
                    "summary": [asdict(s) for s in sections],
                    "file": str(path.relative_to(ROOT)),
                }
            )

        def send_json(
            self, payload: object, status: HTTPStatus = HTTPStatus.OK
        ) -> None:
            self.send_body(
                json.dumps(payload, ensure_ascii=False).encode(),
                "application/json; charset=utf-8",
                status,
            )

        def send_file(self, path: Path, kind: str) -> None:
            self.send_body(path.read_bytes(), kind, HTTPStatus.OK)

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
    deck = load_deck()
    labels = load_labels()
    with ThreadingHTTPServer(("127.0.0.1", 0), handler_for(deck, labels)) as server:
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
