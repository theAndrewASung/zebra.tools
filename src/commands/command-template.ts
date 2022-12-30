import { ZplParameterType, ZplParameterTypeIntegerRange, ZplParameterTypeAlphanumericString, ZplParameterTypeBooleanValue } from './param-types';
import { stringToUint8Array, uint8ArrayToString } from '../utils/utils-buffers';

type ArrayOrJust<T> = T[] | T;

/**
 * Set of expected types for the ZPL parameter schema.
 */
type ZplCommandParamsSchemaType = 'binary' | 'string' | 'number' | Set<string> | RegExp | ZplParameterType;

/**
 * Type definition for a set of parameters passed to a schema to create a command
 */
export type ZplCommandParams = { [ key : string ] : string | Uint8Array | boolean | number };


/**
 * Schema definitions for the parameters passed to a command
 */
type ZplCommandParamsSchema<T extends ZplCommandParams> = {
	[K in keyof T] : {
		readonly type         : boolean    extends T[K] ? ZplParameterTypeBooleanValue
													: number     extends T[K] ? 'number' | ZplParameterTypeIntegerRange
													: string     extends T[K] ? ArrayOrJust<'string' | RegExp | Set<string> | ZplParameterTypeAlphanumericString>
													: Uint8Array extends T[K] ? 'binary'
													: T[K]       extends string | undefined ? Set<Exclude<T[K], undefined>> // this type conditional is for literal types
													: never;
		readonly description? : string;
	}
}

class ZplCommandParamsValidationError<T extends ZplCommandParams> extends Error {
	errors : { [ K in keyof T ] : string[] };

	constructor() {
		super('Invalid parameter.');
		this.errors = {} as { [ K in keyof T ] : string[] };
	}

	add(key: keyof T, error: string) {
		if (!this.errors[key]) this.errors[key] = [];
		this.errors[key].push(error);

		this.message = `Invalid parameter${Object.keys(this.errors).length > 1 ? 's' : ''}: ${Object.keys(this.errors).map(k => {
			const errors = this.errors[k];
			return `\nInvalid parameter "${k}" (${errors.join(', ')})`;
		})}`;

		return this;
	}

	hasErrors() {
		return !!Object.keys(this.errors).length;
	}
}

/**
 * Object schema representation of a Zebra ZPL Command
 * 
 * https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf
 */
export class ZplCommandTemplate<T extends ZplCommandParams> {
	readonly command : string;
	readonly paramSchema? : ZplCommandParamsSchema<T>;
	private readonly _commandSchema : string[];

	constructor(command : string, schema? : ZplCommandParamsSchema<T>) {
		this.command     = command;
		this.paramSchema = schema;

		if (!schema) {
			this._commandSchema = [ command ]
		}
		else {
			const paramKeys = Object.keys(schema);
			const RE = new RegExp(`(${paramKeys.join('|')})`);
	
			// Command schema is an array of alternating string parts (odd indicies) and key lookups (even indicies)
			this._commandSchema = command.split(RE);
		}
	}

	/**
	 * Performs a runtime validation of parameters against this command's schema.
	 * 
	 * @param params - param object to
	 * @returns null if there are no errors
	 * @throws a ZplCommandParamsValidation that maps parameter keys to arrays 
	 * of errors for the relevant keys
	 */
	validateParams(params : T) : void {
		if (!this.paramSchema) return;

		const validationError = new ZplCommandParamsValidationError<T>();

		for (const key in this.paramSchema) {
			const value = params[key];
			const type  = this.paramSchema[key].type;

			// Optionality of parameter will be caught by type checking
			if (value !== undefined) {
				const error = validateZplParameterValue(type, value);
				if (error) validationError.add(key, error);
			}
		}

		if (validationError.hasErrors()) throw validationError;
	}

	/**
	 * Applies a set of arguments to this command's schema.
	 * 
	 * @param values - parameters, in order of the definition provided in the schema 
	 * @returns a buffer (unit8array) representing the command with the given parameters
	 */
	getCommandBuffer(params : T) : Uint8Array {
		let size = 0;
		let parts: Uint8Array[] = [];

		for (let i = 0, ilen = this._commandSchema.length; i < ilen; i++) {
			let part: Uint8Array;

			const isParameter = (i % 2 === 1);
			if (isParameter) {
				const key    = this._commandSchema[i];
				const schema = this.paramSchema?.[key];
				const value  = params[key] ?? '';

				if (value instanceof Uint8Array) {
					part = value;
				}
				else if (typeof value === 'boolean' && schema instanceof ZplParameterTypeBooleanValue) {
					part = stringToUint8Array(value ? schema.t : schema.f);
				}
				else {
					part = stringToUint8Array(value.toString());
				}
			}
			else {
				const plaintext = this._commandSchema[i];
				part = stringToUint8Array(plaintext)
			}

			parts.push(part);
			size += part.length;
		}

		const buffer = new Uint8Array(size);
		let bufferIndex = 0;
		for (const part of parts) {
			buffer.set(part, bufferIndex)
			bufferIndex += part.length;
		}
		return buffer;
	}

	/**
	 * Applies a set of arguments to this command's schema.
	 * 
	 * @param params - parameters, in order of the definition provided in the schema 
	 * @returns a string representing the command with the given parameters
	 */
	getCommandString(params : T) : string {
		const parts: string[] = [];
		for (let i = 0, ilen = this._commandSchema.length; i < ilen; i++) {
			const isParameter = (i % 2 === 1);
			if (isParameter) {
				const key    = this._commandSchema[i];
				const schema = this.paramSchema?.[key];
				const value  = params[key] ?? '';
				if (value instanceof Uint8Array) {
					parts.push(uint8ArrayToString(value));
				}
				else if (typeof value === 'boolean' && schema instanceof ZplParameterTypeBooleanValue) {
					parts.push(value ? schema.t : schema.f);
				}
				else {
					parts.push(value.toString())
				}
			}
			else {
				const plaintext = this._commandSchema[i];
				parts.push(plaintext);
			}
		}
		return parts.join('');
	}

	/**
	 * Returns the generic string representation of this command.
	 * 
	 * @returns a string representation of this command
	 */
	toString() {
		return this.command;
	}
}

/**
 * Helper function that validates a single value against a single parameter schema.
 * 
 * @param type - the zpl type schema of the parameter
 * @param value - the actual value of the parameter to validate
 * @returns null if validation passes, otherwise a string error message of the expect type.
 */
 export function validateZplParameterValue(type : ArrayOrJust<ZplCommandParamsSchemaType>, value : unknown) : string | void {
	if (Array.isArray(type)) {
		const suberrors : Array<void | string> = type.map(subtype => validateZplParameterValue(subtype, value)).filter(error => !!error);
		if (suberrors.length === type.length) return suberrors.join(', or ');
	}
	else if (type instanceof RegExp) {
		if (typeof value !== 'string') return `should be a string`;
		if (!type.test(value)) return `should match regular expression ${type}`;
	}
	else if (type instanceof Set) {
		if (typeof value !== 'string') return `should be a string`;
		if (!type.has(value)) return `should be one of ${[...type.values()].join(', ')}`;
	}
	else if (type instanceof ZplParameterType) {
		const error = type.validate(value);
		if (error) return error;
	}
	else if (type === 'binary') {
		if (!(value instanceof Uint8Array)) return  `should be an Uint8Array`;
	}
	else if (typeof type === 'string') {
		if (typeof value !== type) return `should be of type ${type}`;
	}
	else {
		throw new Error(`Invalid ZPL parameter type "${type}".`);
	}

	return;
}