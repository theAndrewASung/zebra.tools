import { ZplTypeIntegerRange, ZplTypeAlphanumericString } from "../zebra-zpl-types";

describe('ZplTypeIntegerRange', () =>
{
    describe('constructor', () =>
    {
        test('ensures min is smaller than max', () =>
        {
            expect(() => new ZplTypeIntegerRange(2, 1)).toThrow();
        });
    });

    describe('validate(value)', () =>
    {
        let type : ZplTypeIntegerRange;
        beforeAll(() =>
        {
            type = new ZplTypeIntegerRange(3, 5);
        });

        test('checks that value is a number', ()=>
        {
            const result1 = type.validate('This is a string');
            expect(result1).not.toBeNull();

            const result2 = type.validate(false);
            expect(result2).not.toBeNull();

            const result3 = type.validate(4);
            expect(result3).toBeNull();
        });

        test('checks that value is greater than min', ()=>
        {
            const result1 = type.validate(2);
            expect(result1).not.toBeNull();

            const result2 = type.validate(3);
            expect(result2).toBeNull();

            const result3 = type.validate(4);
            expect(result3).toBeNull();
        });

        test('checks that value is less than max', ()=>
        {
            const result1 = type.validate(6);
            expect(result1).not.toBeNull();

            const result2 = type.validate(5);
            expect(result2).toBeNull();

            const result3 = type.validate(4);
            expect(result3).toBeNull();
        });
    });
});


describe('ZplTypeAlphanumericString', () =>
{
    describe('constructor', () =>
    {
        test('ensures minLength is smaller than maxLength', () =>
        {
            expect(() => new ZplTypeAlphanumericString(2, 1)).toThrow();
        });
    });

    describe('validate(value)', () =>
    {
        let type1 : ZplTypeAlphanumericString;
        let type2 : ZplTypeAlphanumericString;
        beforeAll(() =>
        {
            type1 = new ZplTypeAlphanumericString();
            type2 = new ZplTypeAlphanumericString(3, 5);
        });

        test('checks that value is a string', ()=>
        {
            const result1 = type1.validate('ABCDEF');
            expect(result1).toBeNull();

            const result2 = type1.validate(false);
            expect(result2).not.toBeNull();

            const result3 = type1.validate(4);
            expect(result3).not.toBeNull();
        });

        test('checks that value is a alphanumeric', ()=>
        {
            const result1 = type1.validate('ABCEFGHIJKLMNOPQRSTUVWXYZ');
            expect(result1).toBeNull();

            const result2 = type1.validate('0123456789');
            expect(result2).toBeNull();

            const result3 = type1.validate('ABC123!');
            expect(result3).not.toBeNull();

            const result4 = type1.validate('ABC123_');
            expect(result4).not.toBeNull();
        });

        test('checks that string length is greater than minLength', ()=>
        {
            const result1 = type2.validate('AB');
            expect(result1).not.toBeNull();

            const result2 = type2.validate('ABC');
            expect(result2).toBeNull();

            const result3 = type2.validate('ABCD');
            expect(result3).toBeNull();
        });

        test('checks that string length is less than maxLength', ()=>
        {
            const result1 = type2.validate('ABCDEF');
            expect(result1).not.toBeNull();

            const result2 = type2.validate('ABCDE');
            expect(result2).toBeNull();

            const result3 = type2.validate('ABCD');
            expect(result3).toBeNull();
        });
    });
});