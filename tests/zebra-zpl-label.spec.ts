import { ZplLabel } from "../src/zebra-zpl-label";

describe('class ZplLabel', () => {
  describe('constructor(options)', () => {
    test('throws if [options.type] is not "dots" and [options.dpi] is not set', () => {
      expect(() => new ZplLabel({ unit: 'in' })).toThrow();
      expect(() => new ZplLabel({ unit: 'px' })).toThrow();
    });
  });

  describe('getCommandString()', () => {
    test('returns an string with empty label when no commands have been added', () => {
      const label = new ZplLabel();
      expect(label.getCommandString()).toEqual('^XA^XZ');
    });
  })
})