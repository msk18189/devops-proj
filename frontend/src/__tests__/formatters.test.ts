import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDuration, formatDate } from '../utils/formatters.ts';

describe('Frontend Data Formatters', () => {
  it('formats byte sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(52428800)).toBe('50 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('formats media duration seconds to MM:SS', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3665)).toBe('61:05');
  });

  it('formats ISO timestamps to user-friendly strings', () => {
    const formatted = formatDate('2026-10-05T12:00:00Z');
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});
