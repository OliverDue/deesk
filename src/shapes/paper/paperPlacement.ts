import { PAPER_DEFAULT_HEIGHT, PAPER_DEFAULT_WIDTH } from "./paperTypes";

// Top-left corner for a new default-size paper centred on `centre`.
export function paperPlacement(centre: { x: number; y: number }): { x: number; y: number } {
  return {
    x: centre.x - PAPER_DEFAULT_WIDTH / 2,
    y: centre.y - PAPER_DEFAULT_HEIGHT / 2,
  };
}
