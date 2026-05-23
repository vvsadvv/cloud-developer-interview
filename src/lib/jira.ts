import api, { route, type Response } from "@forge/api";

const ISSUE_FIELDS = ["summary", "status", "assignee", "priority", "duedate", "updated"];
const MAX_RESULTS = 100;

interface JiraApiErrorBody {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

export interface JiraProjectSearchResponse {
  values: JiraProject[];
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraStatusCategory {
  key?: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory?: JiraStatusCategory;
}

export interface JiraPriority {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: JiraStatus;
    assignee?: JiraUser | null;
    priority?: JiraPriority | null;
    duedate?: string | null;
    updated?: string;
  };
}

interface JiraSearchResponse {
  issues?: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

async function readErrorMessage(response: Response): Promise<string> {
  const rawBody = await response.text();

  if (!rawBody) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(rawBody) as JiraApiErrorBody;
    const issues = [
      ...(parsed.errorMessages ?? []),
      ...Object.values(parsed.errors ?? {})
    ].filter(Boolean);

    if (issues.length > 0) {
      return issues.join("; ");
    }
  } catch {
    return rawBody;
  }

  return rawBody;
}

async function requestJson<T>(promise: Promise<Response>, action: string): Promise<T> {
  const response = await promise;

  if (!response.ok) {
    throw new Error(`${action} failed: ${await readErrorMessage(response)}`);
  }

  return (await response.json()) as T;
}

async function requestVoid(promise: Promise<Response>, action: string): Promise<void> {
  const response = await promise;

  if (!response.ok) {
    throw new Error(`${action} failed: ${await readErrorMessage(response)}`);
  }
}

async function paginateArray<T>(
  fetchPage: (startAt: number) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  let startAt = 0;

  while (true) {
    const page = await fetchPage(startAt);

    if (page.length === 0) {
      break;
    }

    results.push(...page);

    if (page.length < MAX_RESULTS) {
      break;
    }

    startAt += page.length;
  }

  return results;
}

export async function fetchProjects(): Promise<JiraProject[]> {
  const response = await requestJson<JiraProjectSearchResponse>(
    api.asApp().requestJira(route`/rest/api/3/project/search?maxResults=${50}`),
    "Loading Jira projects"
  );

  return response.values;
}

export async function fetchPriorities(): Promise<JiraPriority[]> {
  return requestJson<JiraPriority[]>(
    api.asApp().requestJira(route`/rest/api/3/priority`),
    "Loading Jira priorities"
  );
}

export async function searchProjectIssues(projectKey: string): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const payload = {
      jql: `project = "${projectKey}" ORDER BY updated DESC`,
      maxResults: MAX_RESULTS,
      fields: ISSUE_FIELDS,
      ...(nextPageToken ? { nextPageToken } : {})
    };

    const response = await requestJson<JiraSearchResponse>(
      api.asApp().requestJira(route`/rest/api/3/search/jql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      }),
      `Loading issues for project ${projectKey}`
    );

    issues.push(...(response.issues ?? []));

    if (response.isLast || !response.nextPageToken) {
      break;
    }

    nextPageToken = response.nextPageToken;
  }

  return issues;
}

export async function fetchAssignableUsers(projectKey: string): Promise<JiraUser[]> {
  return paginateArray((startAt) =>
    requestJson<JiraUser[]>(
      api.asApp().requestJira(
        route`/rest/api/3/user/assignable/search?project=${projectKey}&query=${""}&startAt=${startAt}&maxResults=${MAX_RESULTS}`
      ),
      `Loading assignable users for project ${projectKey}`
    )
  );
}

export async function fetchProjectParticipants(projectKey: string): Promise<JiraUser[]> {
  return paginateArray((startAt) =>
    requestJson<JiraUser[]>(
      api.asApp().requestJira(
        route`/rest/api/3/user/viewissue/search?projectKey=${projectKey}&query=${""}&startAt=${startAt}&maxResults=${MAX_RESULTS}`
      ),
      `Loading project participants for project ${projectKey}`
    )
  );
}

export async function fetchIssueById(issueId: string): Promise<JiraIssue> {
  return requestJson<JiraIssue>(
    api.asApp().requestJira(
      route`/rest/api/3/issue/${issueId}?fields=summary,status,assignee,priority,duedate,updated`
    ),
    `Loading issue ${issueId}`
  );
}

export async function assignIssue(issueId: string, accountId: string): Promise<void> {
  await requestVoid(
    api.asApp().requestJira(route`/rest/api/3/issue/${issueId}/assignee`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        accountId
      })
    }),
    `Assigning issue ${issueId}`
  );
}

export async function updateIssuePriority(issueId: string, priorityId: string): Promise<void> {
  await requestVoid(
    api.asApp().requestJira(route`/rest/api/3/issue/${issueId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        fields: {
          priority: {
            id: priorityId
          }
        }
      })
    }),
    `Updating priority for issue ${issueId}`
  );
}
