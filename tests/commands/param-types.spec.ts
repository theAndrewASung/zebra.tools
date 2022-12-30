import { ZplParameterTypeIntegerRange, ZplParameterTypeAlphanumericString } from "../../src/commands/param-types";

describe('ZplParameterTypeIntegerRange', () => {
    describe('constructor(min, max)', () => {
        test('throws if [min] is smaller than [max]', () => {
            expect(() => new ZplParameterTypeIntegerRange(2, 1)).toThrow();
        });
    });

    describe('validate(value)', () => {
        const type = new ZplParameterTypeIntegerRange(3, 5);

        test('returns a string when [value] is not a number', () => {
            expect(type.validate('This is a string')).not.toBeUndefined();
            expect(type.validate(false)).not.toBeUndefined();
        });

        test('returns a string when [value] is less than [min]', () => {
            expect(type.validate(1)).not.toBeUndefined();
            expect(type.validate(2)).not.toBeUndefined();
        });

        test('returns nothing when [value] is a valid integer', () => {
            expect(type.validate(3)).toBeUndefined();
            expect(type.validate(4)).toBeUndefined();
            expect(type.validate(5)).toBeUndefined();
        });

        test('returns a string when [value] is greater than [max]', () => {
            expect(type.validate(6)).not.toBeUndefined();
            expect(type.validate(7)).not.toBeUndefined();
        });
    });
});

describe('ZplParameterTypeAlphanumericString', () => {
    describe('constructor(minLength, maxLength)', () => {
        test('throws if [minLength] is smaller than [maxLength]', () => {
            expect(() => new ZplParameterTypeAlphanumericString(2, 1)).toThrow();
        });
    });

    describe('validate(value)', () => {
        const alphanumericUnlimited = new ZplParameterTypeAlphanumericString();

        test('returns a string when [value] is not a string', () => {
            expect(alphanumericUnlimited.validate(false)).not.toBeUndefined();
            expect(alphanumericUnlimited.validate(4)).not.toBeUndefined();
        });

        test('returns a string when [value] is not alphanumeric', () => {
            expect(alphanumericUnlimited.validate('ABC123!')).not.toBeUndefined();
            expect(alphanumericUnlimited.validate('ABC123_')).not.toBeUndefined();
        });

        test('returns nothing when [value] is a valid alphanumeric string', () => {
            expect(alphanumericUnlimited.validate('ABCDEF')).toBeUndefined();
            expect(alphanumericUnlimited.validate('ABCEFGHIJKLMNOPQRSTUVWXYZ')).toBeUndefined();
            expect(alphanumericUnlimited.validate('0123456789')).toBeUndefined();
        });

        describe('when [minLength] and/or [maxLength] is provided', () => {
            const alphanumeric3To5 = new ZplParameterTypeAlphanumericString(3, 5);

            test('returns a string when string length of [value] is below [minLength]', () => {
                expect(alphanumeric3To5.validate('AB')).not.toBeUndefined();
                expect(alphanumeric3To5.validate('ABC')).toBeUndefined();
                expect(alphanumeric3To5.validate('ABCD')).toBeUndefined();
            });
    
            test('returns a string when string length of [value] exceeds [maxLength]', () => {
                expect(alphanumeric3To5.validate('ABCD')).toBeUndefined();
                expect(alphanumeric3To5.validate('ABCDE')).toBeUndefined();
                expect(alphanumeric3To5.validate('ABCDEF')).not.toBeUndefined();
            });
        })
    });
});