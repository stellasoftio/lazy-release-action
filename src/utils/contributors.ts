import { Commit } from "../api/git";
import { findUserByQuery, findUserByUsername } from "../api/ungh";

export interface Contributor {
  username: string;
  name?: string;
  email?: string;
}

function isBot(contributor: Contributor): boolean {
  return contributor.username.includes('[bot]') || contributor.email?.includes('[bot]') || false;
}

export async function getContributorsFromCommits(commits: Commit[]): Promise<Contributor[]> {
  const contributorsMap = new Map<string, Contributor>();
  for (const commit of commits) {
    if (contributorsMap.has(commit.author.toLowerCase())) {
      const existingContributor = contributorsMap.get(commit.author);
      if (existingContributor && commit.email) {
        existingContributor.email = commit.email;
      }
    } else if (commit.author) {
      const contributor: Contributor = {
        username: commit.author,
        email: commit.email,
      };
      contributorsMap.set(commit.author.toLowerCase(), contributor);
    }
  }

  for (const contributor of contributorsMap.values()) {
    // Skip API calls for bots
    if (isBot(contributor)) {
      continue;
    }

    if (contributor.email) {
      const result = await findUserByQuery(contributor.email);
      if (result?.user.username) {
        contributor.username = result.user.username;
      }
    }

    if (contributor.username) {
      const result = await findUserByUsername(contributor.username);
      if (result?.user.name) {
        contributor.name = result.user.name;
      }
    }
  }

  const contributors = Array.from(contributorsMap.values())
    .filter((contributor) => contributor.username && contributor.name && !isBot(contributor));
  return contributors;
}
