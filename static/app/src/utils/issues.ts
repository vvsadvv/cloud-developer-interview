import type {
  AutoAssignAssignment,
  DashboardData,
  JiraIssueSummary,
  JiraPrioritySummary,
  JiraUserReference,
  TeamMemberSummary
} from "@shared/types";
import { getDaysUntilDue, getIssueProblems, getSuggestedPriority, isRecentlyUpdated } from "@shared/issueRules";

export function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.includes("Unable to establish a connection with the Custom UI bridge")
  ) {
    return "Forge bridge is unavailable. Open this app from its Jira project page while `forge tunnel` is running instead of visiting localhost directly.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while talking to Jira.";
}

export function decorateIssue(issue: JiraIssueSummary, priorities: JiraPrioritySummary[]): JiraIssueSummary {
  return {
    ...issue,
    problems: getIssueProblems({
      assigneeAccountId: issue.assignee?.accountId,
      dueDate: issue.dueDate,
      priority: issue.priority,
      priorities,
      statusCategory: issue.status.category
    }),
    suggestedPriority: getSuggestedPriority(priorities, issue.priority, issue.dueDate, issue.status.category)
  };
}

function getRecentActivityScore(assignedIssueCount: number, recentUpdatedIssueCount: number, active: boolean): number {
  const rawScore = (active ? 35 : 10) + assignedIssueCount * 9 + recentUpdatedIssueCount * 14;
  return Math.max(0, Math.min(100, rawScore));
}

function getRecentActivityLabel(score: number): string {
  if (score >= 80) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

export function recomputeDashboard(dashboard: DashboardData): DashboardData {
  const issues = dashboard.issues.map((issue) => decorateIssue(issue, dashboard.priorities));
  const team = dashboard.team
    .map((member) => {
      const assignedIssues = issues.filter((issue) => issue.assignee?.accountId === member.accountId);
      const recentUpdatedIssueCount = assignedIssues.filter((issue) => isRecentlyUpdated(issue.updatedAt)).length;
      const recentActivityScore = getRecentActivityScore(assignedIssues.length, recentUpdatedIssueCount, member.active);

      return {
        ...member,
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

  return {
    ...dashboard,
    issues,
    team,
    stats: {
      totalIssues: issues.length,
      assignedIssues: issues.filter((issue) => Boolean(issue.assignee)).length,
      unassignedIssues: issues.filter((issue) => issue.problems.includes("UNASSIGNED")).length,
      deadlineRiskIssues: issues.filter((issue) => issue.problems.includes("LOW_PRIORITY_CLOSE_DEADLINE")).length,
      problemIssues: issues.filter((issue) => issue.problems.length > 0).length,
      activeMembers: team.filter((member) => member.active).length
    }
  };
}

export function replaceIssue(issues: JiraIssueSummary[], nextIssue: JiraIssueSummary): JiraIssueSummary[] {
  return issues.map((issue) => (issue.id === nextIssue.id ? nextIssue : issue));
}

export function withOptimisticAssignee(
  issue: JiraIssueSummary,
  member: JiraUserReference,
  priorities: JiraPrioritySummary[]
): JiraIssueSummary {
  return decorateIssue({
    ...issue,
    assignee: member,
    updatedAt: new Date().toISOString()
  }, priorities);
}

export function withOptimisticPriority(
  issue: JiraIssueSummary,
  nextPriority: JiraPrioritySummary,
  priorities: JiraPrioritySummary[]
): JiraIssueSummary {
  return decorateIssue({
    ...issue,
    priority: nextPriority,
    updatedAt: new Date().toISOString()
  }, priorities);
}

export function createAutoAssignments(
  issues: JiraIssueSummary[],
  members: JiraUserReference[]
): AutoAssignAssignment[] {
  const activeMembers = members.filter((member) => member.active);
  const unassignedIssues = issues.filter((issue) => issue.problems.includes("UNASSIGNED"));

  if (activeMembers.length === 0) {
    return [];
  }

  return unassignedIssues.map((issue) => {
    const member = activeMembers[Math.floor(Math.random() * activeMembers.length)];

    return {
      issueId: issue.id,
      accountId: member.accountId
    };
  });
}
