const THRESHOLD = 110;
const FLY_MS = 220;
const FLY_OUT = {
  like: 'translate(140vw, -4vh) rotate(28deg)',
  dislike: 'translate(-140vw, -4vh) rotate(-28deg)',
  unknown: 'translate(0, 110vh)',
};

const state = { name: '', cards: [], index: 0, answers: [], shownAt: 0, busy: false };
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function show(screen) {
  for (const id of ['start', 'swipe', 'done']) $(id).hidden = id !== screen;
}

function preload(from) {
  for (const card of state.cards.slice(from, from + 3)) new Image().src = card.photo;
}

function cardView(card) {
  return el('article', { className: 'card' }, [
    el('img', { src: card.photo, alt: card.name, draggable: false }),
    el('span', { className: 'stamp yes', textContent: 'Да' }),
    el('span', { className: 'stamp no', textContent: 'Нет' }),
    el('div', { className: 'body' }, [
      el('h2', { textContent: card.name }),
      el('p', { className: 'caption', textContent: card.caption }),
      el('a', { className: 'credit', href: card.source, target: '_blank', rel: 'noopener', textContent: `Фото: ${card.credit}` }),
    ]),
  ]);
}

function render() {
  const { cards, index } = state;
  const views = cards.slice(index, index + 2).map(cardView).reverse();
  if (views.length === 2) views[0].classList.add('behind');
  $('stack').replaceChildren(...views);
  attachDrag($('stack').lastElementChild);
  $('count').textContent = `${index + 1} из ${cards.length}`;
  $('bar').style.width = `${(index / cards.length) * 100}%`;
  $('undo').disabled = index === 0;
  preload(index + 1);
  state.shownAt = performance.now();
}

function mark(view, like, nope) {
  view.style.setProperty('--like', Math.min(1, Math.max(0, like)));
  view.style.setProperty('--nope', Math.min(1, Math.max(0, nope)));
}

function attachDrag(view) {
  let start = null;
  const reset = () => {
    start = null;
    view.classList.remove('dragging');
    view.style.transform = '';
    mark(view, 0, 0);
  };
  view.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a') || state.busy) return;
    start = { x: e.clientX, y: e.clientY };
    view.setPointerCapture(e.pointerId);
    view.classList.add('dragging');
  });
  view.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    view.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
    mark(view, dx / THRESHOLD, -dx / THRESHOLD);
  });
  view.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    view.classList.remove('dragging');
    start = null;
    if (dx > THRESHOLD) answer('like');
    else if (dx < -THRESHOLD) answer('dislike');
    else if (dy > THRESHOLD) answer('unknown');
    else reset();
  });
  view.addEventListener('pointercancel', reset);
}

function answer(kind) {
  if (state.busy || state.index >= state.cards.length) return;
  const card = state.cards[state.index];
  state.answers.push({ card: card.id, answer: kind, ms: Math.round(performance.now() - state.shownAt) });
  state.busy = true;
  const view = $('stack').lastElementChild;
  mark(view, kind === 'like' ? 1 : 0, kind === 'dislike' ? 1 : 0);
  view.classList.add('leaving');
  view.style.transform = FLY_OUT[kind];
  setTimeout(() => {
    state.busy = false;
    state.index += 1;
    if (state.index === state.cards.length) finish();
    else render();
  }, FLY_MS);
}

function undo() {
  if (state.busy || state.index === 0) return;
  state.answers.pop();
  state.index -= 1;
  render();
}

async function finish() {
  show('done');
  $('retry').hidden = true;
  $('saved').textContent = 'Сохраняю…';
  $('summary').replaceChildren();
  const response = await fetch('/api/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: state.name, swipes: state.answers }),
  }).catch(() => null);
  const result = response ? await response.json() : { error: 'приложение не отвечает' };
  if (!response?.ok) {
    $('saved').textContent = `Не сохранилось: ${result.error}`;
    $('retry').hidden = false;
    return;
  }
  $('saved').textContent = `Ответы сохранены в ${result.file}`;
  $('summary').replaceChildren(
    ...result.summary.map((section) =>
      el('section', { className: 'block' }, [
        el('h2', { textContent: section.title }),
        el('ul', {}, section.lines.map((line) => el('li', { textContent: line }))),
      ]),
    ),
  );
}

const KEYS = {
  ArrowRight: () => answer('like'),
  ArrowLeft: () => answer('dislike'),
  ArrowDown: () => answer('unknown'),
  Backspace: undo,
};

document.addEventListener('keydown', (e) => {
  if ($('swipe').hidden || !(e.key in KEYS)) return;
  e.preventDefault();
  KEYS[e.key]();
});

$('yes').addEventListener('click', () => answer('like'));
$('no').addEventListener('click', () => answer('dislike'));
$('unknown').addEventListener('click', () => answer('unknown'));
$('undo').addEventListener('click', undo);
$('retry').addEventListener('click', finish);

const deck = fetch('/api/deck').then((response) => response.json());

$('start-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  state.name = $('name').value.trim();
  if (!state.name) return;
  state.cards = await deck;
  show('swipe');
  render();
});
