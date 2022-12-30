import { concatUint8Arrays } from "../utils/utils-buffers";
import { ZplCommandTemplate, ZplCommandParams } from "./command-template";

export class ZplCommandSet {
    private _zpl : Array<{ schema : ZplCommandTemplate<any>, params : any }>;

    constructor() {
        this._zpl = [];
    }

	/**
	 * Adds a ZPL schema to set of commands
	 * 
	 * @param schema - command scheme
	 * @param parameters - any number of 
	 * @returns this object, for chaining
	 */
    add<T extends ZplCommandParams>(schema : ZplCommandTemplate<T>, params : T) : ZplCommandSet {
      this._zpl.push({ schema, params });
      return this;
    }

	/**
	 * Converts command set into a string
	 * 
	 * @returns command set in string form
	 */
  getCommandString() : string {
		return this._zpl
			.map(({ schema, params }) => schema.getCommandString(params))
			.join('');
    }

	/**
	 * Converts command set into a buffer
	 * 
	 * @returns command set in buffer form
	 */
	getCommandBuffer() : Uint8Array {
		return concatUint8Arrays(...this._zpl.map(({ schema, params }) => schema.getCommandBuffer(params)));
    }
}