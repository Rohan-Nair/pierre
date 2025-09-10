import { queueRender } from '../UnversialRenderer';

export function createFakeContentStream(data: string, letterByLetter = false) {
  return new ReadableStream<string>({
    start(controller) {
      const randomizedData = (() => {
        if (letterByLetter) {
          return data.match(/.{1,4}/gs) ?? [];
        }
        const chunks: string[] = [];
        let remaining = data;
        while (remaining.length > 0) {
          const chunkSize = Math.floor(Math.random() * 100) + 2;
          chunks.push(remaining.slice(0, chunkSize));
          remaining = remaining.slice(chunkSize);
        }
        return chunks;
      })();
      let timeout: NodeJS.Timeout | null = null;
      function pushNext() {
        const nextData = randomizedData.shift();
        if (nextData == null) {
          controller.close();
          return;
        }
        controller.enqueue(nextData);

        if (letterByLetter) {
          return pushNext;
        } else {
          if (timeout != null) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(pushNext, Math.random() + 100);
        }
      }
      if (letterByLetter) {
        queueRender(pushNext);
      } else {
        pushNext();
      }
    },
  });
}
