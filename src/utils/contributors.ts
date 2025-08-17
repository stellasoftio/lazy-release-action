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
  const contributors: Contributor[] = []

  for (const commit of commits) {
    const author = commit.author;
    const email = commit.email;

    let existingContributor: Contributor | undefined = undefined;

    if (email) {
      existingContributor = contributors.find(c => c.email?.toLowerCase() === email.toLowerCase());
      if (existingContributor) {
        continue;
      }
    }

    existingContributor = contributors.find(c => c.username?.toLowerCase() === author.toLowerCase());
    if (existingContributor) {
      if (email && !existingContributor.email) {
        existingContributor.email = email;
      }
      continue;
    }

    contributors.push({
      username: author,
      email: email,
    });
  }

  for (const contributor of contributors) {
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

  const filteredContributors = contributors
    .filter((contributor) => contributor.username && contributor.name && !isBot(contributor));
  return filteredContributors;
}
