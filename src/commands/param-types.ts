/** ZPL TYPE SHORTHAND FUNCTIONS **/
export const Alphanumeric = (minLength? : number, maxLength? : number) => new ZplParameterTypeAlphanumericString(minLength, maxLength);
export const AlphanumericOfLength = (length : number) => new ZplParameterTypeAlphanumericString(length, length);
export const IntegerBetween = (min : number, max : number) => new ZplParameterTypeIntegerRange(min, max);
export const OneOf = <T extends string>(...values : T[]) => new Set(values);

/**
 * Interface for custom ZPL parameter types that have runtime validation
 */
export abstract class ZplParameterType {
	validate : (value : any) => (void | string)
}

/** ZPL TYPE CLASS IMPLEMENTATIONS **/
export class ZplParameterTypeIntegerRange implements ZplParameterType {
	min : number;
	max : number;

	constructor(min : number, max : number) {
		if (min > max) throw new TypeError(`Parameter "min" should be greater than parameter "max"`);
		this.min = min;
		this.max = max;
	}

	validate(value : any){
		if (isNaN(value)) return 'should be a number';
		else if (value < this.min) return `should be greater than ${this.min}`;
		else if (value > this.max) return `should be less than ${this.max}`;
	}
}

export class ZplParameterTypeAlphanumericString implements ZplParameterType {
	minLength : number | void;
	maxLength : number | void;

	constructor(minLength? : number, maxLength? : number) {
		if (minLength && maxLength && minLength > maxLength) throw new TypeError(`Parameter "minLength" should be greater than parameter "maxLength"`);
		this.minLength = minLength;
		this.maxLength = maxLength;
	}

	validate(value : any) : void | string {
		if (typeof value !== 'string') return 'should be a string';

    const range = this.minLength || this.maxLength ? `{${[this.minLength || '', this.maxLength || ''].join(',')}}` : '+';
    const re = new RegExp(`^[A-Z0-9]${range}$`, 'i');
		if (!re.test(value)) {
			let lengthRequirement = '';
			if (this.minLength && this.maxLength) lengthRequirement = ` with length between ${this.minLength} and ${this.maxLength}`;
			else if (this.minLength) lengthRequirement = ` with length greater than ${this.minLength}`;
			else if (this.maxLength) lengthRequirement = ` with length less than ${this.maxLength}`;

			return `should be an alphanumeric string` + lengthRequirement;
		}
	}
}

export class ZplParameterTypeBooleanValue implements ZplParameterType {
	t: string;
	f: string;

	constructor(t: string, f?: string) {
		this.t = t;
		this.f = f ?? '';
	}

	validate(value: any) : string | void {
		if (typeof value !== 'boolean') return 'should be a boolean value';
	}
}