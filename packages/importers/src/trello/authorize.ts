export function trelloAuthorizeUrl(apiKey: string): string {
  const params = new URLSearchParams({
    expiration: "1day",
    scope: "read",
    response_type: "token",
    name: "Montask",
    key: apiKey.trim(),
  });
  return `https://trello.com/1/authorize?${params.toString()}`;
}
