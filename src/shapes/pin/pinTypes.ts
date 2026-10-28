import type { TLBaseBinding, TLShape } from "tldraw";

export const PIN_TYPE = "pin";
export const PIN_BINDING = "pin";
export const PIN_DIAMETER = 28;
export const PIN_RED = "#e5484d";
export const PIN_RIM = "#a82a2f";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PIN_TYPE]: Record<string, never>;
  }
  export interface TLGlobalBindingPropsMap {
    [PIN_BINDING]: Record<string, never>;
  }
}

export type PinShape = TLShape<typeof PIN_TYPE>;
// From the pin to a paper it pins. tldraw removes it when either shape is deleted.
export type PinBinding = TLBaseBinding<typeof PIN_BINDING, Record<string, never>>;
