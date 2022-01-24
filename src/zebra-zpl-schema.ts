import { ZplType, ZplTypeIntegerRange, ZplTypeAlphanumericString } from './zebra-zpl-types';
import { stringToUint8Array, concatUint8Arrays } from './utils/utils-buffers';

/**
 * Set of expected types for the ZPL parameter schema.
 */
type ZplParameterType = string | Set<any> | RegExp | ZplType;

/**
 * Schema definition for a single ZPL parameter
 */
interface ZplParameterOptions {
	readonly key          : string;
	readonly optional     : boolean;
	readonly type         : ZplParameterType | ZplParameterType[];
	readonly delimiter?   : string;
	readonly description? : string;
};

/**
 * Helper function that validates a single value against a single parameter schema.
 * 
 * @param type - the zpl type schema of the parameter
 * @param value - the actual value of the parameter to validate
 * @returns null if validation passes, otherwise a string error message of the expect type.
 */
export function validateZplParameterValue(type : ZplParameterType | ZplParameterType[], value : any) : void | string {
	if (Array.isArray(type)) {
		const suberrors : Array<void | string> = type.map(subtype => validateZplParameterValue(subtype, value)).filter(error => !!error);
		if (suberrors.length === type.length) return suberrors.join(', or ');
	}
	else if (type instanceof RegExp) {
		if (!type.test(value)) return `should match regular expression ${type}`;
	}
	else if (type instanceof Set) {
		if (!type.has(value)) return `should be one of ${[...type.values()].join(', ')}`;
	}
	else if (type instanceof ZplTypeIntegerRange || type instanceof ZplTypeAlphanumericString) {
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

	return null;
}

/**
 * Object schema representation of a Zebra ZPL Command
 * 
 * https://www.zebra.com/content/dam/zebra/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf
 */
export class ZplCommandSchema {
	private command : string;
	private schema  : ZplParameterOptions[];

	constructor(command : string, schema? : ZplParameterOptions[]) {
		this.command = command;
		this.schema  = schema || [];
	}

	/**
	 * Validates a set of arguments against this command's schema.
	 * 
	 * @param parameterValues - parameters, in order of the definition provided in the schema 
	 * @returns null if there are no errors, otherwise an object that maps parameter keys to arrays 
	 * of errors about those parameters
	 */
	validate(...parameterValues : any[]) : void | { [ key : string ] : string[] } {
		const errorsObject : { [ key : string ] : string[] } = {};

		this.schema.map((parameterSchema, index) => {
			const value = parameterValues[index];
			const { key, optional, type } = parameterSchema;

			const errorsArr : string[] = [];
			if (value === null || value === undefined) {
				// Validate optionality
				if (!optional) errorsArr.push(`Required parameter "${key}" is missing.`);
			}
			else {
				// Validate by parameter type
				const error = validateZplParameterValue(type, value);
				if (error) errorsArr.push(`Parameter "${key}" failed type validation (${error}).`);
			}

			if (errorsArr.length) {
				errorsObject[key] = errorsArr;
			}
		});

		if (Object.keys(errorsObject).length) return errorsObject;

		return null;
	}

	private _apply(parameterValues : any[], includeBuffer? : boolean) {
		const lastIndex = this.schema.length - 1;

		let size = includeBuffer ? 0 : null;
		const parameters = this.schema.map((schema, index) => {
			const value     = parameterValues[index] || '';
			const delimiter = (index === lastIndex) ? '' : (schema.delimiter === null || schema.delimiter === undefined ? ',' : schema.delimiter);

			let uint8array : Uint8Array;
			if (includeBuffer) {
				if (value instanceof Uint8Array) uint8array = concatUint8Arrays(value, stringToUint8Array(delimiter));
				else uint8array = stringToUint8Array(value.toString() + delimiter);
	
				if (uint8array) size += uint8array.length;
			}

			return { value, delimiter, uint8array };
		});

		return { parameters, size };
	}

	/**
	 * Applies a set of arguments to this command's schema.
	 * 
	 * @param parameterValues - parameters, in order of the definition provided in the schema 
	 * @returns a buffer (unit8array) representing the command with the given parameters
	 */
	applyAsBuffer(...parameterValues : any[]) : Uint8Array {
		const { parameters, size } = this._apply(parameterValues, true);

		const buffer = new Uint8Array(size + this.command.length);
		buffer.set(stringToUint8Array(this.command), 0);

		let index = this.command.length;
		parameters.map((parameterParsed) => {
			const { uint8array } = parameterParsed;
			
			buffer.set(uint8array, index);
			index += uint8array.length;
		});

		return buffer;
	}

	/**
	 * Applies a set of arguments to this command's schema.
	 * 
	 * @param parameterValues - parameters, in order of the definition provided in the schema 
	 * @returns a string representing the command with the given parameters
	 */
	applyAsString(...parameterValues : any[]) : string {
		const { parameters } = this._apply(parameterValues, false);
		return parameters.reduce((command, { value, delimiter }) => command + value + delimiter, this.command);
	}

	/**
	 * Returns the generic string representation of this command.
	 * 
	 * @returns a string representation of this command
	 */
	toString() : string {
		const lastIndex = this.schema.length - 1;
		return this.schema.reduce((assembledCommand, parameterSchema, index) => {
			const key       = parameterSchema.key;
			const delimiter = (index === lastIndex) ? '' : (parameterSchema.delimiter === null || parameterSchema.delimiter === undefined ? ',' : parameterSchema.delimiter);

			return assembledCommand + key + delimiter;
		}, this.command);
	}
}

export class ZplCommandSet {
    private _zpl : Array<{ schema : ZplCommandSchema, parameters : any[] }>;

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
    add(schema : ZplCommandSchema, ...parameters : any[]) : ZplCommandSet {
        this._zpl.push({ schema, parameters });
        return this;
    }

	/**
	 * Converts command set into a string
	 * 
	 * @returns command set in string form
	 */
    toString() : string {
		return this._zpl
			.map(({ schema, parameters }) => schema.applyAsString(...parameters))
			.join('');
    }

	/**
	 * Converts command set into a buffer
	 * 
	 * @returns command set in buffer form
	 */
	toBuffer() : Uint8Array {
		return concatUint8Arrays(...this._zpl.map(({ schema, parameters }) => schema.applyAsBuffer(...parameters)));
    }
}