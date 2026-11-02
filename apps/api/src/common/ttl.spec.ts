import { ttlToSeconds } from './ttl';

describe('ttlToSeconds', () => {
  it('parses units', () => {
    expect(ttlToSeconds('15m')).toBe(900);
    expect(ttlToSeconds('7d')).toBe(604800);
    expect(ttlToSeconds('3600')).toBe(3600);
  });

  it('rejects garbage', () => {
    expect(() => ttlToSeconds('soon')).toThrow();
  });
});
