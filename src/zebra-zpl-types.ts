/**
 * Class interface for custom implemented ZPL parameter types 
 */
export interface ZplType {
	validate : (value : any) => (void | string)
}

/** ZPL TYPE CLASS IMPLEMENTATIONS **/

export class ZplTypeIntegerRange implements ZplType {
	min : number;
	max : number;

	constructor(min : number, max : number) {
		if (min > max) throw new TypeError(`Parameter "min" should be greater than parameter "max"`);
		this.min = min;
		this.max = max;
	}

	validate(value : any) : void | string {
		if (isNaN(value) || value < this.min || value > this.max) {
			return `should be a number between ${this.min} and ${this.max}`;
		}

		return null;
	}
}

export class ZplTypeAlphanumericString implements ZplType {
	minLength : number;
	maxLength : number;

	constructor(minLength? : number, maxLength? : number) {
		if (minLength && maxLength && minLength > maxLength) throw new TypeError(`Parameter "minLength" should be greater than parameter "maxLength"`);
		this.minLength = minLength;
		this.maxLength = maxLength;
	}

	validate(value : any) : void | string {
        const range = this.minLength || this.maxLength ? `{${[this.minLength || '', this.maxLength || ''].join(',')}}` : '+';
        const re = new RegExp(`^[A-Z0-9]${range}$`, 'i');
		if (typeof value !== 'string' || !re.test(value)) {
            let lengthRequirement = '';
            if (this.minLength && this.maxLength) lengthRequirement = ` with length between ${this.minLength} and ${this.maxLength}`;
            else if (this.minLength) lengthRequirement = ` with length greater than ${this.minLength}`;
            else if (this.maxLength) lengthRequirement = ` with length less than ${this.maxLength}`;

			return `should be an alphanumeric string` + lengthRequirement;
		}

		return null;
	}
}

/** ZPL TYPE SHORTHAND FUNCTIONS **/

export const TypeAlphanumericString = (minLength? : number, maxLength? : number) => new ZplTypeAlphanumericString(minLength, maxLength);
export const TypeIntegerInRange = (min : number, max : number) => new ZplTypeIntegerRange(min, max);
export const TypeOneOf = (...values : string[]) => new Set(values);