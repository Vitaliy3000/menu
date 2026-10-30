from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from enum import StrEnum

from deck import Card, Presentation, Shot

PRONOUNCED: Mapping[str, int] = {
    "sweet": 5,
    "sour": 5,
    "salty": 7,
    "bitter": 3,
    "umami": 7,
    "heat": 4,
    "fat": 8,
}
STRONG_AROMA = 4
MIN_ANSWERED = 3
PRIOR = 2
NEW_CIRCLES = (3, 4)
RARE_CIRCLE = 4


class Answer(StrEnum):
    LIKE = "like"
    DISLIKE = "dislike"
    UNKNOWN = "unknown"


class Facet(StrEnum):
    CIRCLE = "circle"
    STYLE = "style"
    COMPLEXITY = "complexity"
    WEIGHT = "weight"
    CUISINE = "cuisine"
    PROTEIN = "protein"
    METHOD = "method"
    TEXTURE = "texture"
    TASTE = "taste"
    AROMA = "aroma"


class Novelty(StrEnum):
    FAMILIAR = "familiar"
    SIMILAR = "similar"
    CURIOUS = "curious"
    ADVENTUROUS = "adventurous"


@dataclass(frozen=True, slots=True)
class Swipe:
    shot: Shot
    answer: Answer
    ms: int

    @property
    def card(self) -> Card:
        return self.shot.card


@dataclass(frozen=True, slots=True)
class Tally:
    likes: int
    dislikes: int
    unknown: int

    @property
    def answered(self) -> int:
        return self.likes + self.dislikes

    @property
    def rate(self) -> float:
        return self.likes / self.answered if self.answered else 0.0

    @property
    def measured(self) -> bool:
        return self.answered >= MIN_ANSWERED


@dataclass(frozen=True, slots=True)
class Trait:
    facet: Facet
    key: str
    tally: Tally


@dataclass(frozen=True, slots=True)
class Profile:
    swipes: tuple[Swipe, ...]
    home: tuple[Swipe, ...]
    traits: tuple[Trait, ...]
    overall: Tally
    familiar: Tally
    new: Tally
    novelty: Novelty

    def ladder(self, axis: str) -> list[Swipe]:
        pronounced = [
            s
            for s in self.swipes
            if s.answer is not Answer.UNKNOWN and s.card.taste[axis] >= PRONOUNCED[axis]
        ]
        return sorted(pronounced, key=lambda s: s.card.taste[axis])

    def pairs(self) -> list[tuple[Swipe, Swipe]]:
        restaurant = {s.card.id: s for s in self.swipes}
        return [(restaurant[h.card.id], h) for h in self.home]

    def lift(self, trait: Trait) -> float:
        base = self.overall.rate
        return (trait.tally.likes + PRIOR * base) / (
            trait.tally.answered + PRIOR
        ) - base


def tally(swipes: Iterable[Swipe]) -> Tally:
    counts = Counter(s.answer for s in swipes)
    return Tally(counts[Answer.LIKE], counts[Answer.DISLIKE], counts[Answer.UNKNOWN])


def card_traits(card: Card) -> list[tuple[Facet, str]]:
    traits = [
        (Facet.CIRCLE, str(card.circle)),
        (Facet.STYLE, card.style.value),
        (Facet.COMPLEXITY, str(card.complexity)),
        (Facet.WEIGHT, card.weight.value),
        (Facet.PROTEIN, card.protein.value),
        (Facet.METHOD, card.method.value),
    ]
    traits += [(Facet.TEXTURE, t.value) for t in card.textures]
    if card.cuisine:
        traits.append((Facet.CUISINE, card.cuisine))
    traits += [
        (Facet.TASTE, axis)
        for axis, level in card.taste.items()
        if level >= PRONOUNCED[axis]
    ]
    traits += [
        (Facet.AROMA, note)
        for note, level in card.aroma.items()
        if level >= STRONG_AROMA
    ]
    return traits


def novelty(familiar: Tally, new: Tally, rare: Tally) -> Novelty:
    if not new.answered or not familiar.answered:
        return Novelty.FAMILIAR
    if rare.likes and new.rate >= familiar.rate:
        return Novelty.ADVENTUROUS
    gap = familiar.rate - new.rate
    if gap <= 0.2:
        return Novelty.CURIOUS
    if gap <= 0.5:
        return Novelty.SIMILAR
    return Novelty.FAMILIAR


def build_profile(answers: Sequence[Swipe]) -> Profile:
    swipes = [s for s in answers if s.shot.presentation is Presentation.RESTAURANT]
    grouped: dict[tuple[Facet, str], list[Swipe]] = defaultdict(list)
    for swipe in swipes:
        for trait in card_traits(swipe.card):
            grouped[trait].append(swipe)
    traits = tuple(
        Trait(facet, key, tally(group)) for (facet, key), group in grouped.items()
    )
    familiar = tally(s for s in swipes if s.card.circle not in NEW_CIRCLES)
    new = tally(s for s in swipes if s.card.circle in NEW_CIRCLES)
    rare = tally(s for s in swipes if s.card.circle == RARE_CIRCLE)
    return Profile(
        swipes=tuple(swipes),
        home=tuple(s for s in answers if s.shot.presentation is Presentation.HOME),
        traits=traits,
        overall=tally(swipes),
        familiar=familiar,
        new=new,
        novelty=novelty(familiar, new, rare),
    )
