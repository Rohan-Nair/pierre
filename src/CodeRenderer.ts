import { CodeToTokenTransformStream, type RecallToken } from './shiki-stream';
import type {
  HighlighterGeneric,
  StringLiteralUnion,
  ThemedToken,
} from '@shikijs/core';
import {
  createRow,
  createSpanFromToken,
  createWrapperNodes,
} from './utils/html_render_utils';
import type { BundledLanguage, BundledTheme } from 'shiki';
import { queueRender } from './UnversialRenderer';
import { getSharedHighlighter } from './SharedHighlighter';

interface CodeTokenOptionsBase {
  lang: BundledLanguage;
  defaultColor?: StringLiteralUnion<'light' | 'dark'> | 'light-dark()' | false;
  preferJSHighlighter?: boolean;
  startingLineIndex?: number;

  onStart?(controller: WritableStreamDefaultController): unknown;
  onWrite?(token: ThemedToken | RecallToken): unknown;
  onClose?(): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAbort?(reason: any): unknown;
}

interface CodeTokenOptionsSingleTheme extends CodeTokenOptionsBase {
  theme: BundledTheme;
  themes?: never;
}

interface CodeTokenOptionsMultiThemes extends CodeTokenOptionsBase {
  theme?: never;
  themes: { dark: BundledTheme; light: BundledTheme };
}

type CodeRendererOptions =
  | CodeTokenOptionsSingleTheme
  | CodeTokenOptionsMultiThemes;

export class CodeRenderer {
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | undefined;
  options: CodeRendererOptions;
  stream: ReadableStream<string>;
  private pre: HTMLPreElement = document.createElement('pre');
  private code: HTMLElement = document.createElement('code');

  constructor(stream: ReadableStream<string>, options: CodeRendererOptions) {
    this.stream = stream;
    this.options = options;
    this.currentLineIndex = this.options.startingLineIndex ?? 1;
  }

  async setup(wrapper: HTMLElement) {
    const { onStart, onClose, onAbort } = this.options;
    this.highlighter = await getSharedHighlighter(this.getHighlighterOptions());
    const { pre, code } = createWrapperNodes(this.highlighter);
    this.pre = pre;
    wrapper.appendChild(this.pre);
    this.code = code;
    this.stream
      .pipeThrough(
        new CodeToTokenTransformStream({
          highlighter: this.highlighter,
          allowRecalls: true,
          ...this.options,
        })
      )
      .pipeTo(
        new WritableStream({
          start(controller) {
            onStart?.(controller);
          },
          close() {
            onClose?.();
          },
          abort(reason) {
            onAbort?.(reason);
          },
          write: this.handleWrite,
        })
      );
  }

  private queuedTokens: (ThemedToken | RecallToken)[] = [];
  handleWrite = async (token: ThemedToken | RecallToken) => {
    // If we've recalled tokens we haven't rendered yet, we can just yeet them
    // and never apply them
    if ('recall' in token && this.queuedTokens.length >= token.recall) {
      this.queuedTokens.length = this.queuedTokens.length - token.recall;
    } else {
      this.queuedTokens.push(token);
    }
    queueRender(this.render);
    this.options.onWrite?.(token);
  };

  currentLineIndex: number;
  currentLineElement: HTMLElement | undefined;
  render = () => {
    const isScrolledToBottom =
      this.pre.scrollTop + this.pre.clientHeight >= this.pre.scrollHeight - 1;

    for (const token of this.queuedTokens) {
      if ('recall' in token) {
        if (this.currentLineElement == null) {
          throw new Error(
            'Whoopsie, no current line element, shouldnt be possible to get here'
          );
        }
        if (token.recall > this.currentLineElement.childNodes.length) {
          throw new Error(
            'Whoopsie, recal is larger than the line... probably a bug...'
          );
        }
        for (let i = 0; i < token.recall; i++) {
          this.currentLineElement.lastChild?.remove();
        }
      } else {
        const span = createSpanFromToken(token);
        if (this.currentLineElement == null) {
          this.createLine();
        }
        this.currentLineElement?.appendChild(span);
        if (token.content === '\n') {
          this.currentLineIndex++;
          this.createLine();
        }
      }
    }

    if (isScrolledToBottom) {
      this.pre.scrollTop = this.pre.scrollHeight;
    }

    this.queuedTokens.length = 0;
  };

  private createLine() {
    const { row, content } = createRow(this.currentLineIndex);
    this.code.appendChild(row);
    this.currentLineElement = content;
  }

  private getHighlighterOptions() {
    const { lang, themes: _themes, theme, preferJSHighlighter } = this.options;
    const langs: BundledLanguage[] = [lang];
    const themes: BundledTheme[] = [];
    if (theme != null) {
      themes.push(theme);
    } else if (themes) {
      themes.push(_themes.dark);
      themes.push(_themes.light);
    }
    return { langs, themes, preferJSHighlighter };
  }
}
