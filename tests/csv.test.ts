import { toCsv } from '@/lib/csv';

test('serializes rows with header and escapes commas/quotes', () => {
  const csv = toCsv([{ a: 1, b: 'x,y' }, { a: 2, b: 'he said "hi"' }]);
  expect(csv.split('\n')[0]).toBe('a,b');
  expect(csv).toContain('"x,y"');
  expect(csv).toContain('"he said ""hi"""');
});

test('neutralizes a leading formula trigger to prevent CSV formula injection', () => {
  const csv = toCsv([{ note: '=SUM(A1)' }]);
  const dataLine = csv.split('\n')[1];
  // Prefixed with a single quote so spreadsheet apps treat it as text, not a formula.
  expect(dataLine.startsWith("'=SUM(A1)") || dataLine.startsWith('"\'=SUM(A1)"')).toBe(true);
  expect(dataLine.startsWith('=')).toBe(false);
});

test('neutralizes other formula trigger characters (+, -, @) and a leading tab', () => {
  expect(toCsv([{ note: '+1' }]).split('\n')[1]).toBe("'+1");
  expect(toCsv([{ note: '-1' }]).split('\n')[1]).toBe("'-1");
  expect(toCsv([{ note: '@cmd' }]).split('\n')[1]).toBe("'@cmd");
  expect(toCsv([{ note: '\tuh oh' }]).split('\n')[1]).toBe("'\tuh oh");
});

test('does not alter values that do not start with a formula trigger', () => {
  expect(toCsv([{ note: 'normal text' }]).split('\n')[1]).toBe('normal text');
});
