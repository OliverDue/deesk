import { BindingUtil } from "tldraw";
import { PIN_BINDING, type PinBinding } from "./pinTypes";

export class PinBindingUtil extends BindingUtil<PinBinding> {
  static override type = PIN_BINDING;
  static override props = {};

  getDefaultProps() {
    return {};
  }
}
