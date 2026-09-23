import { csvCell, toCsv } from './csv';

describe('csv', () => {
  it('quotes cells containing delimiters, quotes or newlines and doubles inner quotes', () => {
    expect(csvCell('plain', ',')).toBe('plain');
    expect(csvCell('a,b', ',')).toBe('"a,b"');
    expect(csvCell('say "hi"', ',')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak', ',')).toBe('"line\nbreak"');
    expect(csvCell(null, ',')).toBe('');
    expect(csvCell(80, ',')).toBe('80');
  });
  it('defuses formula injection', () => {
    expect(csvCell('=SUM(A1)', ',')).toBe("'=SUM(A1)");
    expect(csvCell('+123', ',')).toBe("'+123");
  });
  it('uses ; for Italian and , for English, with a BOM and CRLF line ends', () => {
    expect(toCsv([['a', 'b'], [1, 'x;y']], 'it')).toBe('\uFEFFa;b\r\n1;"x;y"\r\n');
    expect(toCsv([['a', 'b'], [1, 'x,y']], 'en')).toBe('\uFEFFa,b\r\n1,"x,y"\r\n');
  });
});
