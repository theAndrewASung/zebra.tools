import { ZplType, ZplTypeIntegerRange, ZplTypeAlphanumericString } from './zebra-zpl-types';

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
	else if (type instanceof ZplTypeIntegerRange || type instanceof ZplTypeAlphanumericString)
	{
		const error = type.validate(value);
		if (error) return error;
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

	/**
	 * Applies a set of arguments to this command's schema.
	 * 
	 * @param parameterValues - parameters, in order of the definition provided in the schema 
	 * @returns a string representing the command with the given parameters
	 */
	apply(...parameterValues : any[]) : string {
		const lastIndex = this.schema.length - 1;
		const assembledCommand = this.schema.reduce((assembledCommand, parameterSchema, index) => {
			const value     = parameterValues[index] || '';
			const delimiter = (index === lastIndex) ? '' : (parameterSchema.delimiter === null || parameterSchema.delimiter === undefined ? ',' : parameterSchema.delimiter);

			return assembledCommand + value + delimiter;
		}, this.command);

		return assembledCommand;
	}

	/**
	 * Returns the generic string representation of this command.
	 * 
	 * @returns a string representation of this command
	 */
	toString() {
		const lastIndex = this.schema.length - 1;
		return this.schema.reduce((assembledCommand, parameterSchema, index) => {
			const key       = parameterSchema.key;
			const delimiter = (index === lastIndex) ? '' : (parameterSchema.delimiter === null || parameterSchema.delimiter === undefined ? ',' : parameterSchema.delimiter);

			return assembledCommand + key + delimiter;
		}, this.command);
	}
}