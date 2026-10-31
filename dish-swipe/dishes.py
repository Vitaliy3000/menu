import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from itertools import combinations
from pathlib import Path
from typing import TypedDict

APP_DIR = Path(__file__).resolve().parent
ROOT = APP_DIR.parent
DISHES_FILE = APP_DIR / "dishes.json"
FOODS_FILE = ROOT / "data" / "foods.json"
PHOTOS_DIR = APP_DIR / "photos"
RESULTS_DIR = APP_DIR / "results"
MIN_FREEZE_SCORE = 90


class DeckError(Exception):
    pass


class Answer(StrEnum):
    LIKE = "like"
    DISLIKE = "dislike"
    UNSURE = "unsure"


class Meal(StrEnum):
    LUNCH = "lunch"
    DINNER = "dinner"


MEAL_LABELS = {Meal.LUNCH: "обед", Meal.DINNER: "ужин"}


class RawFood(TypedDict):
    id: str
    freezeScore: int


class RawGroup(TypedDict):
    items: list[RawFood]


class RawFoods(TypedDict):
    groups: list[RawGroup]


class RawPhoto(TypedDict):
    source: str
    author: str
    license: str


class RawDish(TypedDict):
    id: str
    name: str
    caption: str
    cuisine: str
    meal: str
    serve: str
    foods: list[str]
    photo: RawPhoto


class RawAnswer(TypedDict):
    id: str
    answer: str
    ms: int


class RawResult(TypedDict):
    name: str
    answers: list[RawAnswer]


@dataclass(frozen=True, slots=True)
class Photo:
    path: Path
    source: str
    author: str
    license: str


@dataclass(frozen=True, slots=True)
class Dish:
    id: str
    name: str
    caption: str
    cuisine: str
    meal: Meal
    photo: Photo


@dataclass(frozen=True, slots=True)
class Result:
    name: str
    answers: Mapping[str, Answer]


@dataclass(frozen=True, slots=True)
class Pair:
    names: tuple[str, str]
    both: tuple[str, ...]
    one: tuple[str, ...]


def freeze_scores() -> dict[str, int]:
    raw: RawFoods = json.loads(FOODS_FILE.read_text())
    return {
        item["id"]: item["freezeScore"]
        for group in raw["groups"]
        for item in group["items"]
    }


def check_freezing(raw: RawDish, scores: Mapping[str, int]) -> None:
    for food in raw["foods"]:
        if food not in scores:
            raise DeckError(f"«{raw['name']}»: {food} нет в каталоге")
        if scores[food] < MIN_FREEZE_SCORE:
            raise DeckError(
                f"«{raw['name']}»: у {food} заморозка {scores[food]}, нужно больше 85"
            )


def parse_photo(raw: RawPhoto, dish_id: str) -> Photo:
    path = PHOTOS_DIR / f"{dish_id}.jpg"
    if not path.is_file():
        raise DeckError(f"нет фото {path.relative_to(ROOT)}")
    return Photo(path, raw["source"], raw["author"], raw["license"])


def parse_dish(raw: RawDish, scores: Mapping[str, int]) -> Dish:
    check_freezing(raw, scores)
    return Dish(
        id=raw["id"],
        name=raw["name"],
        caption=raw["caption"],
        cuisine=raw["cuisine"],
        meal=Meal(raw["meal"]),
        photo=parse_photo(raw["photo"], raw["id"]),
    )


def load_dishes() -> tuple[Dish, ...]:
    raw: list[RawDish] = json.loads(DISHES_FILE.read_text())
    scores = freeze_scores()
    return tuple(parse_dish(dish, scores) for dish in raw)


def parse_name(raw: str) -> str:
    name = raw.strip()
    if not name:
        raise DeckError("нет имени")
    return name


def parse_answers(
    raw: Sequence[RawAnswer], dishes: Sequence[Dish]
) -> dict[str, Answer]:
    if sorted(a["id"] for a in raw) != sorted(dish.id for dish in dishes):
        raise DeckError("нужен ровно один ответ на каждое блюдо колоды")
    return {a["id"]: Answer(a["answer"]) for a in raw}


def result_json(
    name: str, finished: datetime, raw: Sequence[RawAnswer], dishes: Sequence[Dish]
) -> dict[str, object]:
    names = {dish.id: dish.name for dish in dishes}
    return {
        "name": name,
        "finished": finished.isoformat(timespec="seconds"),
        "answers": [
            {
                "id": a["id"],
                "dish": names[a["id"]],
                "answer": a["answer"],
                "ms": a["ms"],
            }
            for a in raw
        ],
    }


def load_result(path: Path, dishes: Sequence[Dish]) -> Result:
    raw: RawResult = json.loads(path.read_text())
    try:
        answers = parse_answers(raw["answers"], dishes)
    except DeckError as err:
        raise DeckError(f"{path.relative_to(ROOT)}: {err}") from err
    return Result(raw["name"], answers)


def latest_results(dishes: Sequence[Dish]) -> list[Result]:
    latest: dict[str, Result] = {}
    for path in sorted(RESULTS_DIR.glob("*.json")):
        result = load_result(path, dishes)
        latest[result.name.casefold()] = result
    return sorted(latest.values(), key=lambda result: result.name)


def pair(a: Result, b: Result, dishes: Sequence[Dish]) -> Pair:
    both = {Answer.LIKE}
    one = {Answer.LIKE, Answer.UNSURE}
    return Pair(
        (a.name, b.name),
        tuple(d.id for d in dishes if {a.answers[d.id], b.answers[d.id]} == both),
        tuple(d.id for d in dishes if {a.answers[d.id], b.answers[d.id]} == one),
    )


def pairs(dishes: Sequence[Dish]) -> list[Pair]:
    return [pair(a, b, dishes) for a, b in combinations(latest_results(dishes), 2)]
