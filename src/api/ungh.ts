
export interface FindUserByQueryResult {
  user: {
    id: number;
    username: string;
    avatar: string;
  }
}

export async function findUserByQuery(query: string): Promise<FindUserByQueryResult | undefined> {
  const response = await fetch(`https://ungh.cc/users/find/${query}`);
  if (response.ok) {
    return await response.json() as FindUserByQueryResult;
  }

  return undefined;
}

export interface FindUserByUsernameResult {
  user: {
    id: number;
    username: string;
    name: string;
  }
}

export async function findUserByUsername(username: string): Promise<FindUserByUsernameResult | undefined> {
  const response = await fetch(`https://ungh.cc/users/${username}`);
  if (response.ok) {
    return await response.json() as FindUserByUsernameResult;
  }

  return undefined;
}
