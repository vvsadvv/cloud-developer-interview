import Resolver from "@forge/resolver";
import type {
  AssignIssuePayload,
  AutoAssignPayload,
  DashboardData,
  DashboardPayload,
  IssueMutationResult,
  JiraIssueSummary,
  JiraPrioritySummary,
  JiraUserReference,
  ProjectOption,
  RaisePriorityPayload,
  TeamMemberSummary
} from "../shared/types";
import { getIssueProblems, getSuggestedPriority, isRecentlyUpdated } from "../shared/issueRules";
import {
  assignIssue,
  fetchAssignableUsers,
  fetchIssueById,
  fetchPriorities,
  fetchProjectParticipants,
  fetchProjects,
  searchProjectIssues,
  updateIssuePriority,
  type JiraIssue,
  type JiraPriority,
  type JiraProject,
  type JiraUser
} from "./lib/jira";
import {
  getProjectStats,
  getRecentActivityLabel,
  getRecentActivityScore
} from "./lib/issues";

const resolver = new Resolver();

function toProjectOption(project: JiraProject): ProjectOption {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    avatarUrl: project.avatarUrls?.["48x48"]
  };
}

function toPrioritySummary(priority: JiraPriority, order: number): JiraPrioritySummary {
  return {
    id: priority.id,
    name: priority.name,
    order,
    isDefault: priority.isDefault
  };
}

function toUserReference(user: JiraUser): JiraUserReference {
  return {
    accountId: user.accountId,
    displayName: user.displayName,
    emailAddress: user.emailAddress,
    avatarUrl: user.avatarUrls?.["48x48"],
    active: user.active
  };
}

function toIssueSummary(issue: JiraIssue, priorities: JiraPrioritySummary[]): JiraIssueSummary {
  const statusCategory = issue.fields.status?.statusCategory?.key ?? "unknown";
  const priority = issue.fields.priority
    ? priorities.find((candidate) => candidate.id === issue.fields.priority?.id) ??
      toPrioritySummary(issue.fields.priority, priorities.length)
    : null;
  const suggestedPriority = getSuggestedPriority(
    priorities,
    priority,
    issue.fields.duedate ?? null,
    statusCategory
  );

  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary ?? "(No summary)",
    status: {
      id: issue.fields.status?.id ?? "unknown",
      name: issue.fields.status?.name ?? "Unknown",
      category: statusCategory === "new" || statusCategory === "indeterminate" || statusCategory === "done" ? statusCategory : "unknown"
    },
    assignee: issue.fields.assignee ? toUserReference(issue.fields.assignee) : null,
    priority,
    dueDate: issue.fields.duedate ?? null,
    updatedAt: issue.fields.updated ?? new Date(0).toISOString(),
    problems: getIssueProblems({
      assigneeAccountId: issue.fields.assignee?.accountId,
      dueDate: issue.fields.duedate ?? null,
      priority,
      priorities,
      statusCategory
    }),
    suggestedPriority
  };
}

function buildTeamSummary(users: JiraUser[], issues: JiraIssueSummary[]): TeamMemberSummary[] {
  const uniqueUsers = new Map<string, JiraUser>();

  users.forEach((user) => {
    uniqueUsers.set(user.accountId, user);
  });

  return Array.from(uniqueUsers.values())
    .map((user) => {
      const assignedIssues = issues.filter((issue) => issue.assignee?.accountId === user.accountId);
      const recentUpdatedIssueCount = assignedIssues.filter((issue) => isRecentlyUpdated(issue.updatedAt)).length;
      const recentActivityScore = getRecentActivityScore(assignedIssues.length, recentUpdatedIssueCount, user.active);

      return {
        ...toUserReference(user),
        assignedIssueCount: assignedIssues.length,
        recentUpdatedIssueCount,
        recentActivityScore,
        recentActivityLabel: getRecentActivityLabel(recentActivityScore)
      };
    })
    .sort((left, right) => {
      if (right.assignedIssueCount !== left.assignedIssueCount) {
        return right.assignedIssueCount - left.assignedIssueCount;
      }

      return left.displayName.localeCompare(right.displayName);
    });
}

function getProjectKeyFromContext(context: Record<string, any> | undefined): string | undefined {
  return context?.extension?.project?.key ?? context?.extension?.projectKey ?? context?.projectKey;
}

function mergeUsers(...groups: JiraUser[][]): JiraUser[] {
  const uniqueUsers = new Map<string, JiraUser>();

  groups.flat().forEach((user) => {
    uniqueUsers.set(user.accountId, user);
  });

  return Array.from(uniqueUsers.values());
}

async function resolveSelectedProjectKey(payloadProjectKey: string | undefined, context: Record<string, any> | undefined): Promise<string> {
  if (payloadProjectKey) {
    return payloadProjectKey;
  }

  const contextProjectKey = getProjectKeyFromContext(context);

  if (contextProjectKey) {
    return contextProjectKey;
  }

  const projects = await fetchProjects();
  const fallbackProject = projects[0];

  if (!fallbackProject) {
    throw new Error("No Jira projects are available for the current app context.");
  }

  return fallbackProject.key;
}

async function loadDashboard(projectKey: string): Promise<DashboardData> {
  const [projects, rawPriorities, assignableUsers, projectParticipants, rawIssues] = await Promise.all([
    fetchProjects(),
    fetchPriorities(),
    fetchAssignableUsers(projectKey),
    fetchProjectParticipants(projectKey).catch(() => []),
    searchProjectIssues(projectKey)
  ]);

  const priorities = rawPriorities.map((priority, index) => toPrioritySummary(priority, index));
  const issues = rawIssues.map((issue) => toIssueSummary(issue, priorities));
  const issueAssignees = rawIssues
    .map((issue) => issue.fields.assignee)
    .filter((user): user is JiraUser => Boolean(user));
  const teamUsers = mergeUsers(projectParticipants, assignableUsers, issueAssignees);
  const team = buildTeamSummary(teamUsers, issues);

  return {
    selectedProjectKey: projectKey,
    projects: projects.map(toProjectOption).sort((left, right) => left.name.localeCompare(right.name)),
    priorities,
    issues,
    team,
    assignableMembers: assignableUsers
      .map(toUserReference)
      .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    stats: getProjectStats(issues, team.filter((member) => member.active).length),
    fetchedAt: new Date().toISOString()
  };
}

resolver.define("getDashboard", async ({ payload, context }: { payload?: DashboardPayload; context?: Record<string, any> }) => {
  const selectedProjectKey = await resolveSelectedProjectKey(payload?.projectKey, context);
  return loadDashboard(selectedProjectKey);
});

resolver.define("assignIssue", async ({ payload }: { payload: AssignIssuePayload }): Promise<IssueMutationResult> => {
  await assignIssue(payload.issueId, payload.accountId);
  const priorities = (await fetchPriorities()).map((priority, index) => toPrioritySummary(priority, index));
  const issue = toIssueSummary(await fetchIssueById(payload.issueId), priorities);

  return {
    issue,
    message: `${issue.key} was assigned successfully.`
  };
});

resolver.define("raisePriority", async ({ payload }: { payload: RaisePriorityPayload }): Promise<IssueMutationResult> => {
  await updateIssuePriority(payload.issueId, payload.priorityId);
  const priorities = (await fetchPriorities()).map((priority, index) => toPrioritySummary(priority, index));
  const issue = toIssueSummary(await fetchIssueById(payload.issueId), priorities);

  return {
    issue,
    message: `${issue.key} priority was updated to ${payload.priorityName}.`
  };
});

resolver.define("autoAssignUnassigned", async ({ payload }: { payload: AutoAssignPayload }) => {
  const [users, rawIssues, rawPriorities] = await Promise.all([
    fetchAssignableUsers(payload.projectKey),
    searchProjectIssues(payload.projectKey),
    fetchPriorities()
  ]);

  const activeUsers = users.filter((user) => user.active);
  const priorities = rawPriorities.map((priority, index) => toPrioritySummary(priority, index));

  if (activeUsers.length === 0) {
    throw new Error("No active project members are available for automatic assignment.");
  }

  const unassignedIssues = rawIssues
    .map((issue) => toIssueSummary(issue, priorities))
    .filter((issue) => issue.problems.includes("UNASSIGNED"));

  if (unassignedIssues.length === 0) {
    return {
      updatedIssues: [],
      message: "There are no unassigned issues to process."
    };
  }

  const requestedAssignments =
    payload.assignments && payload.assignments.length > 0
      ? payload.assignments
      : unassignedIssues.map((issue, index) => ({
          issueId: issue.id,
          accountId: activeUsers[index % activeUsers.length].accountId
        }));

  const issueIds = new Set(unassignedIssues.map((issue) => issue.id));
  const userIds = new Set(activeUsers.map((user) => user.accountId));

  for (const assignment of requestedAssignments) {
    if (!issueIds.has(assignment.issueId)) {
      throw new Error(`Issue ${assignment.issueId} is no longer available for auto-assignment.`);
    }

    if (!userIds.has(assignment.accountId)) {
      throw new Error(`User ${assignment.accountId} is not assignable in project ${payload.projectKey}.`);
    }

    await assignIssue(assignment.issueId, assignment.accountId);
  }

  const refreshedIssues = await searchProjectIssues(payload.projectKey);
  const updatedIssues = refreshedIssues
    .filter((issue) => requestedAssignments.some((assignment) => assignment.issueId === issue.id))
    .map((issue) => toIssueSummary(issue, priorities));

  return {
    updatedIssues,
    message: `${updatedIssues.length} issue(s) were assigned automatically.`
  };
});

export const handler = resolver.getDefinitions();
