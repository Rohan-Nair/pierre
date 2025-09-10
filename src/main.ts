import './style.css';
import testContent from './tests/example.txt?raw';
import testContent2 from './tests/example2.txt?raw';
import { createFakeContentStream } from './utils/fakeContentStream';
import { CodeRenderer } from './CodeRenderer';

async function renderChunk(event: MouseEvent) {
  const wrapper = document.getElementById('content');
  if (wrapper == null) return;
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.parentNode?.removeChild(event.currentTarget);
  }
  const instance = new CodeRenderer(
    createFakeContentStream(testContent),
    {
      lang: 'typescript',
      themes: { dark: 'tokyo-night', light: 'min-light' },
      defaultColor: false,
    },
    { langs: ['typescript'], themes: ['min-light', 'tokyo-night'] }
  );

  instance.setup(wrapper);

  const instance2 = new CodeRenderer(
    createFakeContentStream(testContent2),
    {
      lang: 'markdown',
      themes: { dark: 'tokyo-night', light: 'min-light' },
      defaultColor: false,
    },
    { langs: ['markdown'], themes: ['min-light', 'tokyo-night'] }
  );
  instance2.setup(wrapper);
}

const toggleTheme = document.getElementById('toggle-theme');
if (toggleTheme != null) {
  toggleTheme.addEventListener('click', () => {
    const codes = document.querySelectorAll('[data-theme]');
    for (const code of codes) {
      if (!(code instanceof HTMLElement)) return;
      code.dataset.theme = code.dataset.theme === 'light' ? 'dark' : 'light';
    }
  });
}

const renderChunkElement = document.getElementById('render-chunk');
if (renderChunkElement != null) {
  renderChunkElement.addEventListener('click', renderChunk);
}
