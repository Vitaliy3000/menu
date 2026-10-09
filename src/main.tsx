import '@fontsource-variable/literata/opsz.css';
import '@fontsource-variable/literata/opsz-italic.css';
import '@fontsource-variable/onest';
import './styles/tokens.css';
import './styles/base.css';
import './styles/timers.css';
import './styles/catalog.css';
import './styles/recipe.css';
import './styles/plan.css';
import './styles/print.css';
import { render } from 'preact';
import { App } from './App.tsx';

render(<App />, document.getElementById('app')!);
