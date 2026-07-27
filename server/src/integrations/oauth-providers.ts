export type OAuthProvider = "slack" | "linear" | "jira";

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  /** Extra fixed query params the provider's authorize URL needs. */
  extraAuthParams?: Record<string, string>;
}

function getConfig(provider: OAuthProvider): ProviderConfig {
  switch (provider) {
    case "slack":
      return {
        authorizeUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        scope: "channels:read,chat:write,team:read",
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
      };
    case "linear":
      return {
        authorizeUrl: "https://linear.app/oauth/authorize",
        tokenUrl: "https://api.linear.app/oauth/token",
        scope: "read,write",
        clientId: process.env.LINEAR_CLIENT_ID,
        clientSecret: process.env.LINEAR_CLIENT_SECRET,
      };
    case "jira":
      // Atlassian OAuth 2.0 (3LO)
      return {
        authorizeUrl: "https://auth.atlassian.com/authorize",
        tokenUrl: "https://auth.atlassian.com/oauth/token",
        scope: "read:jira-work write:jira-work offline_access",
        clientId: process.env.JIRA_CLIENT_ID,
        clientSecret: process.env.JIRA_CLIENT_SECRET,
        extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
      };
  }
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const config = getConfig(provider);
  return Boolean(config.clientId && config.clientSecret);
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string {
  const config = getConfig(provider);
  if (!config.clientId) {
    throw new Error(`${provider.toUpperCase()}_CLIENT_ID is not set`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
    response_type: "code",
    ...config.extraAuthParams,
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string> {
  const config = getConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${provider} OAuth is not configured`);
  }

  // Atlassian's token endpoint wants JSON; Slack and Linear use standard
  // application/x-www-form-urlencoded per OAuth2 convention.
  const isJson = provider === "jira";

  const body = isJson
    ? JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      })
    : new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString();

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const data = (await res.json()) as { access_token?: string; ok?: boolean; error?: string };

  if (!res.ok || data.ok === false || !data.access_token) {
    throw new Error(data.error ?? `${provider} token exchange failed (${res.status})`);
  }

  return data.access_token;
}
