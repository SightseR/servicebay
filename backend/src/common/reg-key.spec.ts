import { regKey } from './reg-key';
test('regKey normalises case, spaces and dashes', () => {
  expect(regKey('dw 769dn')).toBe('DW769DN');
  expect(regKey('ABC-123')).toBe('ABC123');
  expect(regKey('  DZ 694 XR ')).toBe('DZ694XR');
});
