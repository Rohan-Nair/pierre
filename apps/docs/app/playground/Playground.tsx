'use client';

import type {
  AnnotationSide,
  DiffLineAnnotation,
  GetHoveredLineResult,
  SelectedLineRange,
} from '@pierre/diffs';
import { MultiFileDiff } from '@pierre/diffs/react';
import {
  IconColorAuto,
  IconColorDark,
  IconColorLight,
  IconDiffSplit,
  IconDiffUnified,
  IconPlus,
} from '@pierre/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupItem } from '@/components/ui/button-group';
import { Switch } from '@/components/ui/switch';

type ThemeType = 'system' | 'light' | 'dark';
type LayoutStyle = 'split' | 'unified';
type DiffIndicators = 'bars' | 'classic' | 'none';
type LineDiffType = 'word-alt' | 'word' | 'char' | 'none';

type ThreadComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type ThreadState = {
  id: string;
  side: AnnotationSide;
  lineNumber: number;
  isResolved: boolean;
  comments: ThreadComment[];
};

type PlaygroundAnnotationMetadata =
  | { kind: 'thread'; threadId: string }
  | { kind: 'pending' };

const EXAMPLE_ORIGINAL = `function total(items) {
  return items.reduce((sum, item) => {
    return sum + item.price
  }, 0)
}

export function checkout(cart) {
  const subtotal = total(cart.items)
  const fee = subtotal > 100 ? 0 : 10
  return subtotal + fee
}
`;

const EXAMPLE_MODIFIED = `function total(items) {
  return items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
}

export function checkout(cart) {
  const subtotal = total(cart.items);
  const shippingFee = subtotal > 100 ? 0 : 10;
  const tax = subtotal * 0.08;
  return subtotal + shippingFee + tax;
}
`;

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Playground() {
  const [originalText, setOriginalText] = useState(EXAMPLE_ORIGINAL);
  const [modifiedText, setModifiedText] = useState(EXAMPLE_MODIFIED);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('split');
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [diffIndicators, setDiffIndicators] = useState<DiffIndicators>('bars');
  const [lineDiffType, setLineDiffType] = useState<LineDiffType>('word-alt');
  const [showBackgrounds, setShowBackgrounds] = useState(true);
  const [enableWrapping, setEnableWrapping] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const [selectedLines, setSelectedLines] = useState<SelectedLineRange | null>(
    null
  );

  const [threads, setThreads] = useState<ThreadState[]>([]);
  const [pendingComment, setPendingComment] = useState<
    { side: AnnotationSide; lineNumber: number } | undefined
  >();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const addCommentAtLine = useCallback(
    (side: AnnotationSide, lineNumber: number) => {
      if (pendingComment != null) return;
      setPendingComment({ side, lineNumber });
      setSelectedLines({ start: lineNumber, end: lineNumber, side });
    },
    [pendingComment]
  );

  const lineAnnotations: DiffLineAnnotation<PlaygroundAnnotationMetadata>[] =
    useMemo(() => {
      const liveThreads = threads
        .filter((thread) => !thread.isResolved)
        .map((thread) => ({
          side: thread.side,
          lineNumber: thread.lineNumber,
          metadata: { kind: 'thread' as const, threadId: thread.id },
        }));

      if (pendingComment == null) return liveThreads;

      return [
        ...liveThreads,
        {
          side: pendingComment.side,
          lineNumber: pendingComment.lineNumber,
          metadata: { kind: 'pending' as const },
        },
      ];
    }, [threads, pendingComment]);

  const threadMap = useMemo(() => {
    return new Map(threads.map((thread) => [thread.id, thread]));
  }, [threads]);

  const handleLineSelectionEnd = (range: SelectedLineRange | null) => {
    setSelectedLines(range);
    if (range == null) return;

    const side: AnnotationSide =
      (range.endSide ?? range.side) === 'deletions' ? 'deletions' : 'additions';
    const lineNumber = Math.max(range.start, range.end);
    setPendingComment({ side, lineNumber });
  };

  const submitPendingComment = () => {
    const text = commentInputRef.current?.value?.trim() ?? '';
    if (pendingComment == null || text.length === 0) return;

    const id = `${pendingComment.side}-${pendingComment.lineNumber}-${Date.now()}`;
    const newThread: ThreadState = {
      id,
      side: pendingComment.side,
      lineNumber: pendingComment.lineNumber,
      isResolved: false,
      comments: [
        {
          id: `${id}-root`,
          author: 'Guest',
          body: text,
          createdAt: nowLabel(),
        },
      ],
    };

    setThreads((prev) => [...prev, newThread]);
    setPendingComment(undefined);
    setSelectedLines(null);
    if (commentInputRef.current != null) commentInputRef.current.value = '';
  };

  const cancelPendingComment = () => {
    setPendingComment(undefined);
    setSelectedLines(null);
    if (commentInputRef.current != null) commentInputRef.current.value = '';
  };

  const addReply = (threadId: string, body: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          comments: [
            ...thread.comments,
            {
              id: `${threadId}-reply-${thread.comments.length + 1}`,
              author: 'Guest',
              body,
              createdAt: nowLabel(),
            },
          ],
        };
      })
    );
  };

  const resolveThread = (threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId ? { ...thread, isResolved: true } : thread
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Paste your own file content and explore layout, theme, styling,
          annotations, and line selection in one playground.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <FileLabel side="original">Original</FileLabel>
          <FileTextarea
            value={originalText}
            onChange={(event) => setOriginalText(event.target.value)}
            placeholder="Paste your original file contents here…"
          />
          <FileLineCount value={originalText} />
        </div>
        <div className="space-y-1.5">
          <FileLabel side="modified">Modified</FileLabel>
          <FileTextarea
            value={modifiedText}
            onChange={(event) => setModifiedText(event.target.value)}
            placeholder="Paste your modified file contents here…"
          />
          <FileLineCount value={modifiedText} />
        </div>
      </div>

      <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap gap-3">
          <ButtonGroup
            value={layoutStyle}
            onValueChange={(value) => setLayoutStyle(value as LayoutStyle)}
          >
            <ButtonGroupItem value="split">
              <IconDiffSplit />
              Split
            </ButtonGroupItem>
            <ButtonGroupItem value="unified">
              <IconDiffUnified />
              Stacked
            </ButtonGroupItem>
          </ButtonGroup>

          <ButtonGroup
            value={themeType}
            onValueChange={(value) => setThemeType(value as ThemeType)}
          >
            <ButtonGroupItem value="system">
              <IconColorAuto />
              Auto
            </ButtonGroupItem>
            <ButtonGroupItem value="light">
              <IconColorLight />
              Light
            </ButtonGroupItem>
            <ButtonGroupItem value="dark">
              <IconColorDark />
              Dark
            </ButtonGroupItem>
          </ButtonGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Change indicators</span>
            <select
              className="bg-background w-full rounded-md border p-2"
              value={diffIndicators}
              onChange={(event) =>
                setDiffIndicators(event.target.value as DiffIndicators)
              }
            >
              <option value="bars">Bars</option>
              <option value="classic">Classic</option>
              <option value="none">None</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Inline change style</span>
            <select
              className="bg-background w-full rounded-md border p-2"
              value={lineDiffType}
              onChange={(event) =>
                setLineDiffType(event.target.value as LineDiffType)
              }
            >
              <option value="word-alt">Word-alt</option>
              <option value="word">Word</option>
              <option value="char">Character</option>
              <option value="none">None</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span>Backgrounds</span>
            <Switch
              checked={showBackgrounds}
              onCheckedChange={(checked) => setShowBackgrounds(checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span>Wrapping</span>
            <Switch
              checked={enableWrapping}
              onCheckedChange={(checked) => setEnableWrapping(checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span>Line numbers</span>
            <Switch
              checked={showLineNumbers}
              onCheckedChange={(checked) => setShowLineNumbers(checked)}
            />
          </label>
        </div>
      </div>

      <MultiFileDiff<PlaygroundAnnotationMetadata>
        oldFile={{
          name: 'example.ts',
          contents: originalText,
        }}
        newFile={{
          name: 'example.ts',
          contents: modifiedText,
        }}
        className="diff-container"
        selectedLines={selectedLines}
        lineAnnotations={lineAnnotations}
        renderHoverUtility={(
          getHoveredLine: () => GetHoveredLineResult<'diff'> | undefined
        ) => (
          <Button
            size="icon-sm"
            variant="default"
            style={{
              backgroundColor: '#1a76d4',
              transition: 'none',
              cursor: 'pointer',
            }}
            onClick={(event) => {
              const hoveredLine = getHoveredLine();
              if (hoveredLine == null) return;
              event.stopPropagation();
              const side: AnnotationSide =
                hoveredLine.side === 'deletions' ? 'deletions' : 'additions';
              addCommentAtLine(side, hoveredLine.lineNumber);
            }}
          >
            <IconPlus />
          </Button>
        )}
        renderAnnotation={(annotation) => {
          if (annotation.metadata?.kind === 'pending') {
            return (
              <PendingCommentForm
                commentInputRef={commentInputRef}
                onSubmit={submitPendingComment}
                onCancel={cancelPendingComment}
              />
            );
          }

          if (annotation.metadata?.kind !== 'thread') return null;
          const thread = threadMap.get(annotation.metadata.threadId);
          if (thread == null) return null;

          return (
            <CommentThread
              thread={thread}
              onReply={(body: string) => addReply(thread.id, body)}
              onResolve={() => resolveThread(thread.id)}
            />
          );
        }}
        options={{
          diffStyle: layoutStyle,
          themeType,
          theme: { light: 'pierre-light', dark: 'pierre-dark' },
          diffIndicators,
          lineDiffType,
          disableBackground: !showBackgrounds,
          overflow: enableWrapping ? 'wrap' : 'scroll',
          disableLineNumbers: !showLineNumbers,
          enableLineSelection: pendingComment == null,
          enableHoverUtility: pendingComment == null,
          lineHoverHighlight: 'both',
          onLineSelectionEnd: handleLineSelectionEnd,
          onLineSelected: (range: SelectedLineRange | null) => {
            handleLineSelectionEnd(range);
          },
          onLineClick: (info) => {
            if (pendingComment != null) return;
            const side: AnnotationSide =
              info.annotationSide === 'deletions' ? 'deletions' : 'additions';
            addCommentAtLine(side, info.lineNumber);
          },
        }}
      />

      <p className="text-muted-foreground text-xs">
        Tip: hover over any line to see the blue + button, then click it to
        start a comment. You can also click or drag across lines to select them.
        Reply and resolve controls are shown in each thread.
      </p>
    </div>
  );
}

/* ─── Comment components ─── */

function GuestAvatar({ name }: { name: string }) {
  return (
    <Avatar className="h-7 w-7">
      <AvatarFallback className="bg-muted text-xs font-semibold">
        {name[0]}
      </AvatarFallback>
    </Avatar>
  );
}

function PendingCommentForm({
  commentInputRef,
  onSubmit,
  onCancel,
}: {
  commentInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    setTimeout(() => commentInputRef.current?.focus(), 0);
  }, [commentInputRef]);

  return (
    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
      <div style={{ width: '100%' }}>
        <div
          className="max-w-[95%] sm:max-w-[70%]"
          style={{ whiteSpace: 'normal', margin: 20, fontFamily: 'Geist' }}
        >
          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <div className="flex gap-2">
              <div className="relative -mt-0.5 flex-shrink-0">
                <GuestAvatar name="Guest" />
              </div>
              <div className="flex-1">
                <textarea
                  ref={commentInputRef}
                  placeholder="Leave a comment"
                  className="text-foreground bg-background focus:ring-ring min-h-[60px] w-full resize-none rounded-md border p-2 text-sm focus:ring-2 focus:outline-none"
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={onSubmit}
                  >
                    Comment
                  </Button>
                  <button
                    onClick={onCancel}
                    className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-1 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentThread({
  thread,
  onReply,
  onResolve,
}: {
  thread: ThreadState;
  onReply: (body: string) => void;
  onResolve: () => void;
}) {
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [showReplyBox, setShowReplyBox] = useState(false);

  const handleReply = useCallback(() => {
    const value = replyRef.current?.value.trim() ?? '';
    if (value.length === 0) return;
    onReply(value);
    if (replyRef.current != null) replyRef.current.value = '';
    setShowReplyBox(false);
  }, [onReply]);

  return (
    <div
      className="max-w-[95%] sm:max-w-[70%]"
      style={{ whiteSpace: 'normal', margin: 20, fontFamily: 'Geist' }}
    >
      <div className="bg-card rounded-lg border p-5 shadow-sm">
        {/* All comments in the thread */}
        <div className="space-y-4">
          {thread.comments.map((comment, index) => (
            <div
              key={comment.id}
              className={index > 0 ? 'ml-9 sm:ml-[36px]' : ''}
            >
              <div className="flex gap-2">
                <div className="relative -mt-0.5 flex-shrink-0">
                  <GuestAvatar name={comment.author} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground text-sm font-semibold">
                      {comment.author}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {comment.createdAt}
                    </span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">
                    {comment.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        {showReplyBox && (
          <div className="mt-4 ml-9 sm:ml-[36px]">
            <div className="flex gap-2">
              <div className="relative -mt-0.5 flex-shrink-0">
                <GuestAvatar name="Guest" />
              </div>
              <div className="flex-1">
                <textarea
                  ref={replyRef}
                  placeholder="Reply…"
                  className="text-foreground bg-background focus:ring-ring min-h-[60px] w-full resize-none rounded-md border p-2 text-sm focus:ring-2 focus:outline-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleReply}
                  >
                    Reply
                  </Button>
                  <button
                    onClick={() => setShowReplyBox(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer px-3 py-1 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 ml-9 flex items-center gap-4 sm:ml-[36px]">
          {!showReplyBox && (
            <button
              onClick={() => {
                setShowReplyBox(true);
                setTimeout(() => replyRef.current?.focus(), 0);
              }}
              className="text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Reply…
            </button>
          )}
          <button
            onClick={onResolve}
            className="text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── File-input helper components ─── */

function FileLabel({
  children,
  side,
}: {
  children: React.ReactNode;
  side: 'original' | 'modified';
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide uppercase select-none ${
        side === 'original'
          ? 'bg-red-500/10 text-red-500 dark:bg-red-400/10 dark:text-red-400'
          : 'bg-green-500/10 text-green-500 dark:bg-green-400/10 dark:text-green-400'
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          side === 'original'
            ? 'bg-red-500 dark:bg-red-400'
            : 'bg-green-500 dark:bg-green-400'
        }`}
      />
      {children}
    </span>
  );
}

function FileTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      spellCheck={false}
      className="bg-muted focus:ring-ring/40 h-56 w-full resize-none rounded-lg border px-4 py-3 font-mono text-sm leading-relaxed transition-shadow focus:ring-2 focus:outline-none"
    />
  );
}

function FileLineCount({ value }: { value: string }) {
  const lines = value.split('\n').length;
  return (
    <span className="text-muted-foreground block text-right text-[11px] tabular-nums select-none">
      {lines} {lines === 1 ? 'line' : 'lines'}
    </span>
  );
}
