import { validateZplParameterValue, ZplCommandTemplate } from "../../src/commands/command-template";

describe('validateZplParameterValue(type, value)', () =>
{
    describe('when [type] is a regular expression', () => {
        const RE = /^[A-Z][0-9]$/;
        test('returns a string when [value] is not a string', () => {
            expect(validateZplParameterValue(RE, true)).not.toBeUndefined()
        });
        test('returns a string when [value] does not match the regular expression', () => {
            expect(validateZplParameterValue(RE, '1A')).not.toBeUndefined()
        });
        test('returns nothing when [value] matches the regular expression', () => {
            expect(validateZplParameterValue(RE, 'A1')).toBeUndefined()
        });
    });

    describe('when [type] is a Set of strings', () => {
        const S = new Set(['A', 'B', 'C']);
        test('returns a string when [value] is not a string', () => {
            expect(validateZplParameterValue(S, true)).not.toBeUndefined()
        });
        test('returns a string when [value] is not part of the set', () => {
            expect(validateZplParameterValue(S, 'K')).not.toBeUndefined()
        });
        test('returns nothing when [value] is part of the set', () => {
            expect(validateZplParameterValue(S, 'A')).toBeUndefined()
        });
    });

    describe('when [type] is an Array of multiple types', () => {
        const A = [ /^[A-Z][0-9]$/, 'number' as const ];
        test('returns a string when [value] is none of the types in the array', () => {
            expect(validateZplParameterValue(A, true)).not.toBeUndefined()
            expect(validateZplParameterValue(A, 'A')).not.toBeUndefined()
        });
        test('returns nothing when [value] is one of the types in the array', () => {
            expect(validateZplParameterValue(A, 'A1')).toBeUndefined()
            expect(validateZplParameterValue(A, 5)).toBeUndefined()
        });
    });

    describe('when [type] is "string"', () => {
        test('returns a string when [value] is not a string', () => {
            expect(validateZplParameterValue('string', true)).not.toBeUndefined()
        })
        test('returns nothing when [value] is a string', () => {
            expect(validateZplParameterValue('string', 'string')).toBeUndefined()
        })
    })

    describe('when [type] is "number"', () => {
        test('returns a string when [value] is not a number', () => {
            expect(validateZplParameterValue('number', true)).not.toBeUndefined()
        })
        test('returns nothing when [value] is a number', () => {
            expect(validateZplParameterValue('number', 5)).toBeUndefined()
        })
    })

    describe('when [type] is "binary"', () => {
        test('returns a string when [value] is not a Uint8Array', () => {
            expect(validateZplParameterValue('binary', true)).not.toBeUndefined()
        })
        test('returns nothing when [value] is a Uint8Array', () => {
            expect(validateZplParameterValue('binary', new Uint8Array())).toBeUndefined()
        })
    })
});

describe('class ZplCommandTemplate', () => {
    describe('validateParams(params)', () => {
        const schema = new ZplCommandTemplate<{
            a: string,
            b?: 'Y' | 'N',
            c?: number,
        }>('^NNa,b;c', {
            a : { type : /^[A-Z][0-9]$/ },
            b : { type : new Set(['N', 'Y']) },
            c : { type : 'number' },
        });
        
        test('throws if any provided parameters do not meet the criteria', () => {
            expect(() => schema.validateParams({ a : '1A' })).toThrow();
            expect(() => schema.validateParams({ a : '1A', b : 'N', c: 5 })).toThrow();
        });

        test('returns nothing if all parameters pass', () => {
            expect(schema.validateParams({ a : 'A1' })).toBeUndefined();
            expect(schema.validateParams({ a : 'A1', b : 'N', c: 5 })).toBeUndefined();
        });
    });

    describe('getCommandString(params)', () => {
        const schema = new ZplCommandTemplate<{ x?: string, y?: number, z?: string }>('^AZx,y,z', {
            x : { type : 'string' },
            y : { type : 'number' },
            z : { type : 'string' },
        });

        test('returns a string representation of the command', () => {
            expect(schema.getCommandString({ x : 'a', y : 3, z : 'c' } )).toEqual('^AZa,3,c');
            expect(schema.getCommandString({ x : 'LONG', y : 329, z : 'TeST' })).toEqual('^AZLONG,329,TeST');
        });

        test('uses empty string for parameters that are not provided', () => {
            expect(schema.getCommandString({})).toEqual('^AZ,,');
            expect(schema.getCommandString({ z : 'c' })).toEqual('^AZ,,c');
        });
    });

    describe('getCommandBuffer(params)', () => {
        const schema = new ZplCommandTemplate<{ x?: string, y?: number, z?: Uint8Array }>('^AZx,y,z', {
            x : { type : 'string' },
            y : { type : 'number' },
            z : { type : 'binary' },
        });

        test('returns a buffer representation of the command', () => {
            expect(schema.getCommandBuffer({ x : 'a', y : 3, z : new Uint8Array([1]) } )).toHaveLength(8);
            expect(schema.getCommandBuffer({ x : 'LONG', y : 329 })).toHaveLength(12);
        });
    });
});