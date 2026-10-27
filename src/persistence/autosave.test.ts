import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutosaver } from "./autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autosaver", () => {
  it("saves once after a burst of changes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule();
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately when a save is pending", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush does nothing when nothing changed", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("never runs two saves at once, and saves again for changes made during a save", async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const save = async () => {
      calls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 300));
      active -= 1;
    };
    const saver = createAutosaver(save, 100);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100); // first save starts
    saver.schedule(); // change during the save
    await vi.advanceTimersByTimeAsync(2000);
    expect(maxActive).toBe(1);
    expect(calls).toBe(2);
  });

  it("reports a failed save and keeps working afterwards", async () => {
    const onError = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
    const saver = createAutosaver(save, 100, onError);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(onError).toHaveBeenCalledTimes(1);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("cancel drops a pending save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    saver.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });
});
