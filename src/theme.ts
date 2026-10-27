export const TABLE_COLOR = "#FFF6D8";

export function applyTheme(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--deesk-table", TABLE_COLOR);
}
