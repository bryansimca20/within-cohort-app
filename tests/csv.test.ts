import { toCsv } from '@/lib/csv';

test('serializes rows with header and escapes commas/quotes', () => {
  const csv = toCsv([{ a: 1, b: 'x,y' }, { a: 2, b: 'he said "hi"' }]);
  expect(csv.split('\n')[0]).toBe('a,b');
  expect(csv).toContain('"x,y"');
  expect(csv).toContain('"he said ""hi"""');
});
