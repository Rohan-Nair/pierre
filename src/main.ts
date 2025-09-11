import './style.css';
import testContent from './tests/example.txt?raw';
import testContent2 from './tests/example2.txt?raw';
import { createFakeContentStream } from './utils/fakeContentStream';
import { CodeRenderer } from './CodeRenderer';
import { disposeHighlighter } from './SharedHighlighter';

async function startStreaming(event: MouseEvent) {
  const wrapper = document.getElementById('content');
  if (wrapper == null) return;
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.parentNode?.removeChild(event.currentTarget);
  }
  let completed = 0;
  const onClose = () => {
    completed++;
    if (completed >= 2) {
      disposeHighlighter();
    }
  };
  const instance = new CodeRenderer(createFakeContentStream(testContent), {
    lang: 'typescript',
    themes: { dark: 'tokyo-night', light: 'vitesse-light' },
    defaultColor: false,
    onClose,
  });

  instance.setup(wrapper);

  const instance2 = new CodeRenderer(
    createFakeContentStream(testContent2, true),
    {
      lang: 'markdown',
      themes: { dark: 'solarized-dark', light: 'solarized-light' },
      defaultColor: false,
      onClose,
    }
  );
  instance2.setup(wrapper);
}

document.getElementById('toggle-theme')?.addEventListener('click', () => {
  const codes = document.querySelectorAll('[data-theme]');
  for (const code of codes) {
    if (!(code instanceof HTMLElement)) return;
    code.dataset.theme = code.dataset.theme === 'light' ? 'dark' : 'light';
  }
});

document
  .getElementById('stream-code')
  ?.addEventListener('click', startStreaming);
