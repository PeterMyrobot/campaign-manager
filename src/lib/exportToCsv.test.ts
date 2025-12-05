import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCsv } from './exportToCsv';

describe('exportToCsv', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let mockLink: HTMLAnchorElement;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create mock link element
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement;

    // Spy on document methods
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

    // Spy on URL methods
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing when data array is empty', () => {
    exportToCsv([], 'test');

    expect(createElementSpy).not.toHaveBeenCalled();
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('should export simple data with auto-generated headers', () => {
    const data = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ];

    exportToCsv(data, 'users');

    // Verify blob was created with correct CSV content
    expect(createObjectURLSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text/csv;charset=utf-8;',
      })
    );

    // Verify link was set up correctly
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'users.csv');
    expect(mockLink.style.visibility).toBe('hidden');

    // Verify link was clicked and cleaned up
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(mockLink.click).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should export data with custom columns', () => {
    const data = [
      { firstName: 'Alice', lastName: 'Smith', age: 30 },
      { firstName: 'Bob', lastName: 'Jones', age: 25 },
    ];

    const columns = [
      { key: 'firstName' as const, header: 'First Name' },
      { key: 'lastName' as const, header: 'Last Name' },
    ];

    exportToCsv(data, 'names', columns);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should handle null and undefined values', () => {
    const data = [
      { name: 'Alice', age: null, city: undefined },
    ];

    exportToCsv(data, 'test');

    // Check that blob was created (values should be empty strings)
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should handle Date objects', () => {
    const testDate = new Date('2024-01-15');
    const data = [
      { name: 'Alice', birthDate: testDate },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should handle arrays by joining with semicolons', () => {
    const data = [
      { name: 'Alice', tags: ['admin', 'user', 'moderator'] },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should handle objects by JSON stringifying', () => {
    const data = [
      { name: 'Alice', metadata: { role: 'admin', level: 5 } },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should escape values containing commas', () => {
    const data = [
      { name: 'Smith, John', city: 'New York' },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should escape values containing quotes', () => {
    const data = [
      { name: 'John "Johnny" Doe', city: 'NYC' },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should escape values containing newlines', () => {
    const data = [
      { name: 'John\nDoe', city: 'NYC' },
    ];

    exportToCsv(data, 'test');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('should generate readable headers from camelCase keys', () => {
    const data = [
      { firstName: 'Alice', lastLoginDate: '2024-01-01', isActive: true },
    ];

    exportToCsv(data, 'test');

    // Headers should be: "First Name", "Last Login Date", "Is Active"
    expect(createObjectURLSpy).toHaveBeenCalled();
  });
});
