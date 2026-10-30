from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass

from deck import Deck, Labels, Method, Protein, Style, Texture, Weight
from scoring import Answer, Facet, Novelty, Profile, Swipe, Trait

NOTABLE_LIFT = 0.15
PORTRAIT_SIZE = 8

CIRCLES: Mapping[str, str] = {
    "1": "своя кухня",
    "2": "мировая классика",
    "3": "популярная этника",
    "4": "редкие кухни",
}
STYLES: Mapping[str, str] = {
    Style.HOME: "домашнее",
    Style.RESTAURANT: "ресторанное",
    Style.STREET: "уличное",
}
COMPLEXITIES: Mapping[str, str] = {
    "1": "простой вкус",
    "2": "несколько слоёв вкуса",
    "3": "много специй и составляющих",
}
WEIGHTS: Mapping[str, str] = {
    Weight.LIGHT: "лёгкое",
    Weight.MEDIUM: "средней сытости",
    Weight.HEARTY: "сытное",
    Weight.HEAVY: "тяжёлое",
}
PROTEINS: Mapping[str, str] = {
    Protein.CHICKEN: "курица",
    Protein.DUCK: "утка",
    Protein.BEEF: "говядина",
    Protein.PORK: "свинина",
    Protein.LAMB: "баранина",
    Protein.MINCE: "фарш",
    Protein.WHITE_FISH: "белая рыба",
    Protein.FATTY_FISH: "жирная рыба",
    Protein.SHRIMP_SQUID: "креветки и кальмары",
    Protein.MUSSELS_OYSTERS: "мидии",
    Protein.LIVER: "печень",
    Protein.OFFAL: "субпродукты",
    Protein.EGGS: "яйца",
    Protein.DELI: "колбасы и копчёности",
    Protein.CHEESE: "сыр и творог",
    Protein.LEGUMES: "бобовые",
    Protein.VEGETABLES: "без мяса",
}
METHODS: Mapping[str, str] = {
    Method.GRILLED: "жареное и гриль",
    Method.DEEP_FRIED: "во фритюре",
    Method.BRAISED: "тушёное в соусе",
    Method.BAKED: "запечённое",
    Method.BOILED: "варёное и супы",
    Method.CURED: "солёная рыба",
    Method.RAW: "сырые мясо и рыба",
    Method.FRESH: "свежие овощи и зелень",
}
TEXTURES: Mapping[str, str] = {
    Texture.JELLY: "желе и студень",
    Texture.SLIMY: "слизистое",
    Texture.STICKY: "тягучее",
    Texture.RUBBERY: "упругое",
    Texture.RAW: "сырое",
    Texture.MUSHY: "пюреобразное",
    Texture.BEADS: "крупинки",
    Texture.GRISTLE: "хрящи",
    Texture.CHUNKS: "кусочки в гладком",
}
NOVELTIES: Mapping[Novelty, str] = {
    Novelty.FAMILIAR: "ест привычное",
    Novelty.SIMILAR: "пробует похожее на знакомое",
    Novelty.CURIOUS: "с удовольствием пробует новое",
    Novelty.ADVENTUROUS: "ищет необычное",
}
FACET_TITLES: Mapping[Facet, str] = {
    Facet.CIRCLE: "Привычность",
    Facet.STYLE: "Подача",
    Facet.COMPLEXITY: "Сложность",
    Facet.WEIGHT: "Сытость",
    Facet.CUISINE: "Кухни",
    Facet.PROTEIN: "Главное в блюде",
    Facet.METHOD: "Способ",
    Facet.TEXTURE: "Текстуры",
    Facet.TASTE: "Яркий вкус",
    Facet.AROMA: "Ароматы",
}
SECTIONS: Sequence[tuple[str, tuple[Facet, ...]]] = (
    (
        "Кухня и подача",
        (Facet.CIRCLE, Facet.STYLE, Facet.COMPLEXITY, Facet.WEIGHT, Facet.CUISINE),
    ),
    ("Что и как", (Facet.PROTEIN, Facet.METHOD, Facet.TEXTURE)),
    ("Вкус и аромат", (Facet.TASTE, Facet.AROMA)),
)
MIN_ANSWERS: Mapping[Facet, int] = {Facet.CUISINE: 2, Facet.AROMA: 3}
MARKS: Mapping[Answer, str] = {
    Answer.LIKE: "♥",
    Answer.DISLIKE: "✕",
    Answer.UNKNOWN: "?",
}


@dataclass(frozen=True, slots=True)
class Section:
    title: str
    lines: tuple[str, ...]


def trait_label(trait: Trait, labels: Labels) -> str:
    match trait.facet:
        case Facet.CIRCLE:
            return CIRCLES[trait.key]
        case Facet.STYLE:
            return STYLES[trait.key]
        case Facet.COMPLEXITY:
            return COMPLEXITIES[trait.key]
        case Facet.WEIGHT:
            return WEIGHTS[trait.key]
        case Facet.CUISINE:
            return f"{labels.cuisines[trait.key]} кухня"
        case Facet.PROTEIN:
            return PROTEINS[trait.key]
        case Facet.METHOD:
            return METHODS[trait.key]
        case Facet.TEXTURE:
            return TEXTURES[trait.key]
        case Facet.TASTE:
            return labels.tastes[trait.key]
        case Facet.AROMA:
            return labels.aroma[trait.key]


def marked(swipes: Sequence[Swipe], describe: Callable[[Swipe], str]) -> str:
    groups = []
    for answer in Answer:
        picked = [describe(s) for s in swipes if s.answer is answer]
        if picked:
            groups.append(f"{MARKS[answer]} {', '.join(picked)}")
    return " · ".join(groups)


def counted(trait: Trait, labels: Labels) -> str:
    return f"{trait_label(trait, labels)} {trait.tally.likes} из {trait.tally.answered}"


def notable(profile: Profile, labels: Labels, *, liked: bool) -> str:
    sign = 1 if liked else -1
    picked = [
        t
        for t in profile.traits
        if t.tally.measured and sign * profile.lift(t) >= NOTABLE_LIFT
    ]
    picked.sort(key=lambda t: sign * profile.lift(t), reverse=True)
    return (
        ", ".join(counted(t, labels) for t in picked[:PORTRAIT_SIZE])
        or "ничего заметно"
    )


def ladder_line(title: str, axis: str, profile: Profile) -> str:
    rungs = marked(
        profile.ladder(axis), lambda s: f"{s.card.name.lower()} {s.card.taste[axis]}"
    )
    return f"{title} (из 10): {rungs or 'яркие карточки пропущены'}"


def totals_line(profile: Profile) -> str:
    overall = profile.overall
    return (
        f"Нравится {overall.likes} из {len(profile.swipes)}, "
        f"не нравится {overall.dislikes}, не знает {overall.unknown}."
    )


def novelty_line(profile: Profile) -> str:
    familiar, new = profile.familiar, profile.new
    return (
        f"Новое: {NOVELTIES[profile.novelty]}. "
        f"Своя кухня и классика — {familiar.likes} из {familiar.answered}, "
        f"этника и редкие кухни — {new.likes} из {new.answered}, не знает {new.unknown}."
    )


def portrait(profile: Profile, labels: Labels) -> Section:
    return Section(
        "Портрет",
        (
            totals_line(profile),
            f"Больше обычного нравится: {notable(profile, labels, liked=True)}.",
            f"Меньше обычного: {notable(profile, labels, liked=False)}.",
            ladder_line("Острота", "heat", profile),
            ladder_line("Кислое", "sour", profile),
            novelty_line(profile),
        ),
    )


def facet_line(facet: Facet, profile: Profile, labels: Labels) -> str | None:
    minimum = MIN_ANSWERS.get(facet, 1)
    traits = [
        t for t in profile.traits if t.facet is facet and t.tally.answered >= minimum
    ]
    if not traits:
        return None
    ranked = sorted(traits, key=profile.lift, reverse=True)
    return f"{FACET_TITLES[facet]}: " + " · ".join(counted(t, labels) for t in ranked)


def facet_section(
    title: str, facets: Sequence[Facet], profile: Profile, labels: Labels
) -> Section:
    lines = (facet_line(facet, profile, labels) for facet in facets)
    return Section(title, tuple(line for line in lines if line))


def series_section(profile: Profile, deck: Deck) -> Section:
    lines = []
    for series in deck.series:
        swipes = [s for s in profile.swipes if s.card.series == series]
        cards = marked(swipes, lambda s: s.card.name.lower())
        lines.append(f"{series.title} ({series.varies}): {cards}")
    return Section("Серии", tuple(lines))


def summarize(profile: Profile, deck: Deck, labels: Labels) -> tuple[Section, ...]:
    facets = (
        facet_section(title, facets, profile, labels) for title, facets in SECTIONS
    )
    return (portrait(profile, labels), *facets, series_section(profile, deck))
