export interface Autosaver {
  schedule(): void;
  flush(): Promise<void>;
  cancel(): void;
}

export function createAutosaver(
  save: () => Promise<void>,
  delayMs: number,
  onError?: (e: unknown) => void,
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let dirty = false;

  const run = async () => {
    while (dirty) {
      dirty = false;
      try {
        await save();
      } catch (e) {
        onError?.(e);
      }
    }
  };

  const start = (): Promise<void> => {
    if (!running) {
      running = run().finally(() => {
        running = null;
      });
    }
    return running;
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    schedule() {
      dirty = true;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void start();
      }, delayMs);
    },
    async flush() {
      clearTimer();
      if (dirty) await start();
      else if (running) await running;
    },
    cancel() {
      dirty = false;
      clearTimer();
    },
  };
}
