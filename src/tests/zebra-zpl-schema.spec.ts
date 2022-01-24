import { validateZplParameterValue, ZplCommandSchema } from "../zebra-zpl-schema";

describe('validateZplParameterValue', () =>
{
    test('validates value for matching against a Regular Expression', () =>
    {
        const result1 = validateZplParameterValue(/^[A-Z][0-9]$/, 'A1');
        expect(result1).toBeNull();

        const result2 = validateZplParameterValue(/^[A-Z][0-9]$/, 'U9');
        expect(result2).toBeNull();

        const result3 = validateZplParameterValue(/^[A-Z][0-9]$/, '1A');
        expect(result3).not.toBeNull();
    });
    
    test('validates value for matching against a value in a Set', () =>
    {
        const set = new Set(['A', 3, false]);

        const result1 = validateZplParameterValue(set, 'A');
        expect(result1).toBeNull();

        const result2 = validateZplParameterValue(set, 3);
        expect(result2).toBeNull();

        const result3 = validateZplParameterValue(set, false);
        expect(result3).toBeNull();

        const result4 = validateZplParameterValue(set, 'B');
        expect(result4).not.toBeNull();
        
        const result5 = validateZplParameterValue(set, true);
        expect(result5).not.toBeNull();
    });

    test('validates value using typeof for a string', () =>
    {
        const result1 = validateZplParameterValue('string', 'A');
        expect(result1).toBeNull();

        const result2 = validateZplParameterValue('string', 3);
        expect(result2).not.toBeNull();

        const result3 = validateZplParameterValue('number', 3);
        expect(result3).toBeNull();

        const result4 = validateZplParameterValue('number', 'A');
        expect(result4).not.toBeNull();

        const result5 = validateZplParameterValue('boolean', false);
        expect(result5).toBeNull();

        const result6 = validateZplParameterValue('boolean', 'A');
        expect(result6).not.toBeNull();
    });

    test('validates against multiple types for Arrays of matchers', () =>
    {
        const compoundType = [ /^[A-Z][0-9]$/, new Set([ 'B', 'K' ]) ];

        const result1 = validateZplParameterValue(compoundType, 'A1');
        expect(result1).toBeNull();

        const result2 = validateZplParameterValue(compoundType, '1A');
        expect(result2).not.toBeNull();

        const result3 = validateZplParameterValue(compoundType, 'B');
        expect(result3).toBeNull();

        const result4 = validateZplParameterValue(compoundType, 'K');
        expect(result4).toBeNull();

        const result5 = validateZplParameterValue(compoundType, 'D');
        expect(result5).not.toBeNull();

        const result6 = validateZplParameterValue(compoundType, 'U9');
        expect(result6).toBeNull();
    });
});

describe('ZplCommandSchema', () =>
{
    describe('validate(...parameterValues)', () =>
    {
        let schema : ZplCommandSchema;
        beforeAll(() =>
        {
            schema = new ZplCommandSchema('^NN', [
                { key : 'a', optional : false, type : /^[A-Z][0-9]$/ },
                { key : 'b', optional : true,  type : new Set(['N', 'Y']), delimiter : ';' },
                { key : 'c', optional : true,  type : 'number' },
            ]);
        });

        test('returns null when validation passes', () =>
        {
            const result1 = schema.validate('A1', 'N', 5);
            expect(result1).toBeNull();
            
            const result2 = schema.validate('U9', 'Y', 10);
            expect(result2).toBeNull();
        });

        test('returns array of errors per parameters when validation fails', () =>
        {
            const result1 = schema.validate('1A', 'N', 5);
            expect(result1).not.toBeNull();
            expect(result1).toHaveProperty('a');
            expect(result1).not.toHaveProperty('b');
            expect(result1).not.toHaveProperty('c');

            const result2 = schema.validate('U9', 'E', 10);
            expect(result2).not.toBeNull();
            expect(result2).not.toHaveProperty('a');
            expect(result2).toHaveProperty('b');
            expect(result2).not.toHaveProperty('c');
        });
    });

    describe('apply()', () =>
    {
        test('returns a string representation of the command', () =>
        {
            const schema = new ZplCommandSchema('^AZ', [
                { key : 'x', optional : true, type : 'string' },
                { key : 'y', optional : true, type : 'string' },
                { key : 'z', optional : true, type : 'string' },
            ]);

            expect(schema.apply('a','b','c')).toEqual('^AZa,b,c');
            expect(schema.apply('LONG','KK','TeST')).toEqual('^AZLONG,KK,TeST');
        });

        test('uses empty string when parameters are not provided', () =>
        {
            const schema = new ZplCommandSchema('^AZ', [
                { key : 'x', optional : true, type : 'string' },
                { key : 'y', optional : true, type : 'string' },
                { key : 'z', optional : true, type : 'string' },
            ]);

            expect(schema.apply()).toEqual('^AZ,,');
            expect(schema.apply(null,null,'c')).toEqual('^AZ,,c');
        });

        test('uses provided delimiters in parameters', () =>
        {
            const schema = new ZplCommandSchema('^A', [
                { key : 'f', optional : true, type : 'string', delimiter : '' },
                { key : 'd', optional : true, type : 'string', delimiter : ':' },
                { key : 'o', optional : true, type : 'string', delimiter : '.' },
                { key : 'x', optional : true, type : 'string', delimiter : ';' },
            ]);

            expect(schema.apply('a','b','c','d')).toEqual('^Aab:c.d');
            expect(schema.apply('@','LONG','KK','TeST')).toEqual('^A@LONG:KK.TeST');
        });
    });

    describe('toString()', () =>
    {
        test('returns a string representation of the command', () =>
        {
            const schema = new ZplCommandSchema('^AZ', [
                { key : 'x', optional : true, type : 'string' },
                { key : 'y', optional : true, type : 'string' },
                { key : 'z', optional : true, type : 'string' },
            ]);

            expect(schema.toString()).toEqual('^AZx,y,z');
        });

        test('uses provided delimiters in parameters', () =>
        {
            const schema = new ZplCommandSchema('^A', [
                { key : 'f', optional : true, type : 'string', delimiter : '' },
                { key : 'd', optional : true, type : 'string', delimiter : ':' },
                { key : 'o', optional : true, type : 'string', delimiter : '.' },
                { key : 'x', optional : true, type : 'string', delimiter : ';' },
            ]);

            expect(schema.toString()).toEqual('^Afd:o.x');
        });
    });
});