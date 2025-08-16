import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContributorsFromCommits } from './contributors';
import { findUserByQuery, findUserByUsername } from '../api/ungh';
import type { Commit } from '../api/git';

// Mock the ungh API functions
vi.mock('../api/ungh');

const mockFindUserByQuery = vi.mocked(findUserByQuery);
const mockFindUserByUsername = vi.mocked(findUserByUsername);

describe('getContributorsFromCommits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no commits provided', async () => {
    const result = await getContributorsFromCommits([]);
    expect(result).toEqual([]);
    expect(mockFindUserByQuery).not.toHaveBeenCalled();
    expect(mockFindUserByUsername).not.toHaveBeenCalled();
  });

  it('should handle commits with author but no email', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'testuser',
        email: '',
        subject: 'Test commit',
      },
    ];

    mockFindUserByUsername.mockResolvedValue({
      user: {
        id: 1,
        username: 'testuser',
        name: 'Test User',
      },
    });

    const result = await getContributorsFromCommits(commits);

    expect(result).toEqual([
      {
        username: 'testuser',
        name: 'Test User',
        email: '',
      },
    ]);
    expect(mockFindUserByQuery).not.toHaveBeenCalled();
    expect(mockFindUserByUsername).toHaveBeenCalledWith('testuser');
  });

  it('should handle commits with both author and email', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'testuser',
        email: 'test@example.com',
        subject: 'Test commit',
      },
    ];

    mockFindUserByQuery.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        avatar: 'avatar.png',
      },
    });

    mockFindUserByUsername.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        name: 'Actual Test User',
      },
    });

    const result = await getContributorsFromCommits(commits);

    expect(result).toEqual([
      {
        username: 'actualtestuser',
        name: 'Actual Test User',
        email: 'test@example.com',
      },
    ]);
    expect(mockFindUserByQuery).toHaveBeenCalledWith('test@example.com');
    expect(mockFindUserByUsername).toHaveBeenCalledWith('actualtestuser');
  });

  it('should deduplicate contributors by author name (case insensitive)', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'TestUser',
        email: 'test@example.com',
        subject: 'First commit',
      },
      {
        hash: 'def456',
        author: 'testuser',
        email: 'test@example.com',
        subject: 'Second commit',
      },
      {
        hash: 'ghi789',
        author: 'TESTUSER',
        email: '', // Different email scenario
        subject: 'Third commit',
      },
    ];

    mockFindUserByQuery.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        avatar: 'avatar.png',
      },
    });

    mockFindUserByUsername.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        name: 'Actual Test User',
      },
    });

    const result = await getContributorsFromCommits(commits);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'actualtestuser',
      name: 'Actual Test User',
      email: 'test@example.com',
    });
    expect(mockFindUserByQuery).toHaveBeenCalledTimes(1);
    expect(mockFindUserByUsername).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple different contributors', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'user1',
        email: 'user1@example.com',
        subject: 'First commit',
      },
      {
        hash: 'def456',
        author: 'user2',
        email: 'user2@example.com',
        subject: 'Second commit',
      },
    ];

    mockFindUserByQuery
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'actualuser1',
          avatar: 'avatar1.png',
        },
      })
      .mockResolvedValueOnce({
        user: {
          id: 2,
          username: 'actualuser2',
          avatar: 'avatar2.png',
        },
      });

    mockFindUserByUsername
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'actualuser1',
          name: 'Actual User One',
        },
      })
      .mockResolvedValueOnce({
        user: {
          id: 2,
          username: 'actualuser2',
          name: 'Actual User Two',
        },
      });

    const result = await getContributorsFromCommits(commits);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      username: 'actualuser1',
      name: 'Actual User One',
      email: 'user1@example.com',
    });
    expect(result).toContainEqual({
      username: 'actualuser2',
      name: 'Actual User Two',
      email: 'user2@example.com',
    });
  });

  it('should handle API failures gracefully', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'testuser',
        email: 'test@example.com',
        subject: 'Test commit',
      },
    ];

    mockFindUserByQuery.mockResolvedValue(undefined);
    mockFindUserByUsername.mockResolvedValue(undefined);

    const result = await getContributorsFromCommits(commits);

    expect(result).toEqual([]);
    expect(mockFindUserByQuery).toHaveBeenCalledWith('test@example.com');
    expect(mockFindUserByUsername).toHaveBeenCalledWith('testuser');
  });

  it('should filter out contributors without name', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'user1',
        email: 'user1@example.com',
        subject: 'First commit',
      },
      {
        hash: 'def456',
        author: 'user2',
        email: 'user2@example.com',
        subject: 'Second commit',
      },
    ];

    mockFindUserByQuery
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'actualuser1',
          avatar: 'avatar1.png',
        },
      })
      .mockResolvedValueOnce({
        user: {
          id: 2,
          username: 'actualuser2',
          avatar: 'avatar2.png',
        },
      });

    // First user gets a name, second doesn't
    mockFindUserByUsername
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'actualuser1',
          name: 'Actual User One',
        },
      })
      .mockResolvedValueOnce(undefined);

    const result = await getContributorsFromCommits(commits);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'actualuser1',
      name: 'Actual User One',
      email: 'user1@example.com',
    });
  });

  it('should handle commits with empty author', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: '',
        email: 'test@example.com',
        subject: 'Test commit',
      },
      {
        hash: 'def456',
        author: 'validuser',
        email: 'valid@example.com',
        subject: 'Valid commit',
      },
    ];

    mockFindUserByQuery.mockResolvedValue({
      user: {
        id: 1,
        username: 'validuser',
        avatar: 'avatar.png',
      },
    });

    mockFindUserByUsername.mockResolvedValue({
      user: {
        id: 1,
        username: 'validuser',
        name: 'Valid User',
      },
    });

    const result = await getContributorsFromCommits(commits);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'validuser',
      name: 'Valid User',
      email: 'valid@example.com',
    });
    // Should only call APIs for the valid user
    expect(mockFindUserByQuery).toHaveBeenCalledTimes(1);
    expect(mockFindUserByUsername).toHaveBeenCalledTimes(1);
  });

  it('should update email for existing contributor when processing multiple commits', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'testuser',
        email: '', // No email initially
        subject: 'First commit',
      },
      {
        hash: 'def456',
        author: 'testuser',
        email: 'test@example.com', // Email provided in second commit
        subject: 'Second commit',
      },
    ];

    mockFindUserByQuery.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        avatar: 'avatar.png',
      },
    });

    mockFindUserByUsername.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        name: 'Actual Test User',
      },
    });

    const result = await getContributorsFromCommits(commits);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      username: 'actualtestuser',
      name: 'Actual Test User',
      email: 'test@example.com',
    });
  });

  it('should handle partial API responses', async () => {
    const commits: Commit[] = [
      {
        hash: 'abc123',
        author: 'testuser',
        email: 'test@example.com',
        subject: 'Test commit',
      },
    ];

    // findUserByQuery succeeds but findUserByUsername fails
    mockFindUserByQuery.mockResolvedValue({
      user: {
        id: 1,
        username: 'actualtestuser',
        avatar: 'avatar.png',
      },
    });

    mockFindUserByUsername.mockResolvedValue(undefined);

    const result = await getContributorsFromCommits(commits);

    expect(result).toEqual([]);
    expect(mockFindUserByQuery).toHaveBeenCalledWith('test@example.com');
    expect(mockFindUserByUsername).toHaveBeenCalledWith('actualtestuser');
  });
});
