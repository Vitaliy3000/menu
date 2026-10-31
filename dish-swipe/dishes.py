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
MIN_FREEZE_SCORE = 80
MIN_LUNCH_MICROWAVE_SCORE = 80


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
    microwaveScore: int


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
class Scores:
    freeze: int
    microwave: int


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
class Reply:
    answer: Answer
    ms: int


@dataclass(frozen=True, slots=True)
class Result:
    name: str
    replies: Mapping[str, Reply]


@dataclass(frozen=True, slots=True)
class Pair:
    names: tuple[str, str]
    both: tuple[str, ...]
    one: tuple[str, ...]


def catalog_scores() -> dict[str, Scores]:
    raw: RawFoods = json.loads(FOODS_FILE.read_text())
    return {
        item["id"]: Scores(item["freezeScore"], item["microwaveScore"])
        for group in raw["groups"]
        for item in group["items"]
    }


def check_scores(raw: RawDish, meal: Meal, catalog: Mapping[str, Scores]) -> None:
    for food in raw["foods"]:
        if food not in catalog:
            raise DeckError(f"«{raw['name']}»: {food} нет в каталоге")
        scores = catalog[food]
        if scores.freeze < MIN_FREEZE_SCORE:
            raise DeckError(
                f"«{raw['name']}»: у {food} заморозка {scores.freeze}, "
                f"нужно не меньше {MIN_FREEZE_SCORE}"
            )
        if meal is Meal.LUNCH and scores.microwave < MIN_LUNCH_MICROWAVE_SCORE:
            raise DeckError(
                f"«{raw['name']}»: обед, а у {food} микроволновка {scores.microwave}, "
                f"нужно не меньше {MIN_LUNCH_MICROWAVE_SCORE}"
            )


def parse_photo(raw: RawPhoto, dish_id: str) -> Photo:
    path = PHOTOS_DIR / f"{dish_id}.jpg"
    if not path.is_file():
        raise DeckError(f"нет фото {path.relative_to(ROOT)}")
    return Photo(path, raw["source"], raw["author"], raw["license"])


def parse_dish(raw: RawDish, catalog: Mapping[str, Scores]) -> Dish:
    meal = Meal(raw["meal"])
    check_scores(raw, meal, catalog)
    return Dish(
        id=raw["id"],
        name=raw["name"],
        caption=raw["caption"],
        cuisine=raw["cuisine"],
        meal=meal,
        photo=parse_photo(raw["photo"], raw["id"]),
    )


def load_dishes() -> tuple[Dish, ...]:
    raw: list[RawDish] = json.loads(DISHES_FILE.read_text())
    catalog = catalog_scores()
    return tuple(parse_dish(dish, catalog) for dish in raw)


def parse_name(raw: str) -> str:
    name = raw.strip()
    if not name:
        raise DeckError("нет имени")
    return name


def parse_replies(raw: Sequence[RawAnswer], dishes: Sequence[Dish]) -> dict[str, Reply]:
    ids = [a["id"] for a in raw]
    if len(set(ids)) != len(ids) or not {dish.id for dish in dishes}.issuperset(ids):
        raise DeckError("ответы — только на блюда колоды, по одному на блюдо")
    return {a["id"]: Reply(Answer(a["answer"]), a["ms"]) for a in raw}


def load_result(path: Path, dishes: Sequence[Dish]) -> Result:
    raw: RawResult = json.loads(path.read_text())
    deck = {dish.id for dish in dishes}
    return Result(
        raw["name"],
        {
            a["id"]: Reply(Answer(a["answer"]), a["ms"])
            for a in raw["answers"]
            if a["id"] in deck
        },
    )


def latest_results(dishes: Sequence[Dish]) -> dict[str, Result]:
    latest: dict[str, Result] = {}
    for path in sorted(RESULTS_DIR.glob("*.json")):
        result = load_result(path, dishes)
        latest[result.name.casefold()] = result
    return latest


def answered(name: str, dishes: Sequence[Dish]) -> list[str]:
    result = latest_results(dishes).get(name.casefold())
    return list(result.replies) if result else []


def merge(name: str, raw: Sequence[RawAnswer], dishes: Sequence[Dish]) -> Result:
    previous = latest_results(dishes).get(name.casefold())
    replies = {**(previous.replies if previous else {}), **parse_replies(raw, dishes)}
    if len(replies) != len(dishes):
        raise DeckError("нужен ответ на каждое блюдо колоды")
    return Result(name, replies)


def result_json(
    result: Result, finished: datetime, dishes: Sequence[Dish]
) -> dict[str, object]:
    return {
        "name": result.name,
        "finished": finished.isoformat(timespec="seconds"),
        "answers": [
            {
                "id": dish.id,
                "dish": dish.name,
                "answer": result.replies[dish.id].answer,
                "ms": result.replies[dish.id].ms,
            }
            for dish in dishes
        ],
    }


def pair(a: Result, b: Result, dishes: Sequence[Dish]) -> Pair:
    both = {Answer.LIKE}
    one = {Answer.LIKE, Answer.UNSURE}

    def answers(dish: Dish) -> set[Answer]:
        return {a.replies[dish.id].answer, b.replies[dish.id].answer}

    return Pair(
        (a.name, b.name),
        tuple(d.id for d in dishes if answers(d) == both),
        tuple(d.id for d in dishes if answers(d) == one),
    )


def pairs(dishes: Sequence[Dish]) -> list[Pair]:
    complete = sorted(
        (r for r in latest_results(dishes).values() if len(r.replies) == len(dishes)),
        key=lambda result: result.name,
    )
    return [pair(a, b, dishes) for a, b in combinations(complete, 2)]
