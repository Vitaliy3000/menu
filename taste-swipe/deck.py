import json
import subprocess
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum
from itertools import chain, zip_longest
from pathlib import Path
from typing import NotRequired, TypedDict

APP_DIR = Path(__file__).resolve().parent
ROOT = APP_DIR.parent
DECK_FILE = ROOT / "data" / "taste-deck.json"
FOODS_FILE = ROOT / "data" / "foods.json"
PHOTOS_DIR = APP_DIR / "photos"

LABELS_SCRIPT = (
    "const m = await import('./src/lib/flavor.ts');"
    "const labels = {tastes: m.TASTES, aroma: m.AROMA_NOTES, cuisines: m.CUISINES};"
    "console.log(JSON.stringify(labels));"
)


class DeckError(Exception):
    pass


class RawFood(TypedDict):
    id: str
    taste: dict[str, int]
    aroma: NotRequired[dict[str, int]]
    cuisines: NotRequired[list[str]]


class RawGroup(TypedDict):
    items: list[RawFood]


class RawFoods(TypedDict):
    groups: list[RawGroup]


class RawPhoto(TypedDict):
    source: str
    author: str
    license: str


class RawSeries(TypedDict):
    id: str
    title: str
    varies: str


class RawCard(TypedDict):
    id: str
    name: str
    caption: str
    series: str
    foods: list[str]
    circle: int
    style: str
    complexity: int
    weight: str
    protein: str
    method: str
    textures: NotRequired[list[str]]
    photo: RawPhoto
    homePhoto: NotRequired[RawPhoto]


class RawDeck(TypedDict):
    series: list[RawSeries]
    cards: list[RawCard]


class Presentation(StrEnum):
    RESTAURANT = "restaurant"
    HOME = "home"


class Style(StrEnum):
    HOME = "home"
    RESTAURANT = "restaurant"
    STREET = "street"


class Weight(StrEnum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEARTY = "hearty"
    HEAVY = "heavy"


class Protein(StrEnum):
    CHICKEN = "chicken"
    DUCK = "duck"
    BEEF = "beef"
    PORK = "pork"
    LAMB = "lamb"
    MINCE = "mince"
    WHITE_FISH = "white-fish"
    FATTY_FISH = "fatty-fish"
    SHRIMP_SQUID = "shrimp-squid"
    MUSSELS_OYSTERS = "mussels-oysters"
    LIVER = "liver"
    OFFAL = "offal"
    EGGS = "eggs"
    DELI = "deli"
    CHEESE = "cheese"
    LEGUMES = "legumes"
    VEGETABLES = "vegetables"


class Method(StrEnum):
    GRILLED = "grilled"
    DEEP_FRIED = "deep-fried"
    BRAISED = "braised"
    BAKED = "baked"
    BOILED = "boiled"
    CURED = "cured"
    RAW = "raw"
    FRESH = "fresh"


class Texture(StrEnum):
    JELLY = "jelly"
    SLIMY = "slimy"
    STICKY = "sticky"
    RUBBERY = "rubbery"
    RAW = "raw"
    MUSHY = "mushy"
    BEADS = "beads"
    GRISTLE = "gristle"
    CHUNKS = "chunks"


@dataclass(frozen=True, slots=True)
class Food:
    id: str
    taste: Mapping[str, int]
    aroma: Mapping[str, int]
    cuisines: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class Photo:
    path: Path
    source: str
    author: str
    license: str


@dataclass(frozen=True, slots=True)
class Series:
    id: str
    title: str
    varies: str


@dataclass(frozen=True, slots=True)
class Card:
    id: str
    name: str
    caption: str
    series: Series
    foods: tuple[Food, ...]
    circle: int
    style: Style
    complexity: int
    weight: Weight
    protein: Protein
    method: Method
    textures: tuple[Texture, ...]
    photo: Photo
    home_photo: Photo | None

    @property
    def taste(self) -> dict[str, int]:
        return strongest(food.taste for food in self.foods)

    @property
    def aroma(self) -> dict[str, int]:
        return strongest(food.aroma for food in self.foods)

    @property
    def cuisine(self) -> str | None:
        cuisines = self.foods[0].cuisines
        return cuisines[0] if cuisines else None


@dataclass(frozen=True, slots=True)
class Shot:
    id: str
    card: Card
    presentation: Presentation
    photo: Photo


@dataclass(frozen=True, slots=True)
class Deck:
    series: tuple[Series, ...]
    shots: tuple[Shot, ...]

    def shot(self, shot_id: str) -> Shot:
        for shot in self.shots:
            if shot.id == shot_id:
                return shot
        raise DeckError(f"нет карточки «{shot_id}»")


@dataclass(frozen=True, slots=True)
class Labels:
    tastes: Mapping[str, str]
    aroma: Mapping[str, str]
    cuisines: Mapping[str, str]


def strongest(levels: Iterable[Mapping[str, int]]) -> dict[str, int]:
    merged: dict[str, int] = {}
    for key, level in chain.from_iterable(m.items() for m in levels):
        merged[key] = max(level, merged.get(key, 0))
    return merged


def load_foods(path: Path) -> dict[str, Food]:
    raw: RawFoods = json.loads(path.read_text())
    return {
        item["id"]: Food(
            item["id"],
            item["taste"],
            item.get("aroma", {}),
            tuple(item.get("cuisines", [])),
        )
        for group in raw["groups"]
        for item in group["items"]
    }


def parse_photo(raw: RawPhoto, name: str) -> Photo:
    path = PHOTOS_DIR / f"{name}.jpg"
    if not path.is_file():
        raise DeckError(f"нет фото {path.relative_to(ROOT)}")
    return Photo(path, raw["source"], raw["author"], raw["license"])


def parse_card(
    raw: RawCard, series: Mapping[str, Series], foods: Mapping[str, Food]
) -> Card:
    home = raw.get("homePhoto")
    return Card(
        id=raw["id"],
        name=raw["name"],
        caption=raw["caption"],
        series=series[raw["series"]],
        foods=tuple(foods[food_id] for food_id in raw["foods"]),
        circle=raw["circle"],
        style=Style(raw["style"]),
        complexity=raw["complexity"],
        weight=Weight(raw["weight"]),
        protein=Protein(raw["protein"]),
        method=Method(raw["method"]),
        textures=tuple(Texture(t) for t in raw.get("textures", [])),
        photo=parse_photo(raw["photo"], raw["id"]),
        home_photo=parse_photo(home, f"{raw['id']}-home") if home else None,
    )


def card_shots(card: Card, home_first: bool) -> list[Shot]:
    shots = [Shot(card.id, card, Presentation.RESTAURANT, card.photo)]
    if card.home_photo:
        home = Shot(f"{card.id}-home", card, Presentation.HOME, card.home_photo)
        shots.insert(0 if home_first else 1, home)
    return shots


def show_order(cards: Sequence[Card], series: Sequence[Series]) -> tuple[Shot, ...]:
    paired = [card.id for card in cards if card.home_photo]
    home_first = set(paired[1::2])
    by_series = []
    for s in series:
        stacks = [card_shots(c, c.id in home_first) for c in cards if c.series == s]
        firsts = [stack[0] for stack in stacks]
        by_series.append(firsts + [shot for stack in stacks for shot in stack[1:]])
    rounds = zip_longest(*by_series)
    return tuple(shot for shot in chain.from_iterable(rounds) if shot is not None)


def load_deck() -> Deck:
    raw: RawDeck = json.loads(DECK_FILE.read_text())
    series = tuple(Series(s["id"], s["title"], s["varies"]) for s in raw["series"])
    by_id = {s.id: s for s in series}
    foods = load_foods(FOODS_FILE)
    cards = [parse_card(card, by_id, foods) for card in raw["cards"]]
    return Deck(series, show_order(cards, series))


def load_labels() -> Labels:
    done = subprocess.run(  # noqa: S603
        ["node", "--input-type=module", "-e", LABELS_SCRIPT],  # noqa: S607
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    labels = json.loads(done.stdout)
    return Labels(labels["tastes"], labels["aroma"], labels["cuisines"])
