export type IssueProblem = "UNASSIGNED" | "LOW_PRIORITY_CLOSE_DEADLINE";
export type DashboardTab = "issues" | "team";
export type PrioritySuggestionLabel = "Medium" | "High";

export interface ProjectOption {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
}

export interface JiraUserReference {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
  active: boolean;
}

export interface JiraStatusSummary {
  id: string;
  name: string;
  category: "new" | "indeterminate" | "done" | "unknown";
}

export interface JiraPrioritySummary {
  id: string;
  name: string;
  order: number;
  isDefault?: boolean;
}

export interface PrioritySuggestion {
  id: string;
  name: string;
  label: PrioritySuggestionLabel;
}

export interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
  status: JiraStatusSummary;
  assignee: JiraUserReference | null;
  priority: JiraPrioritySummary | null;
  dueDate: string | null;
  updatedAt: string;
  problems: IssueProblem[];
  suggestedPriority: PrioritySuggestion | null;
}

export interface TeamMemberSummary extends JiraUserReference {
  assignedIssueCount: number;
  recentUpdatedIssueCount: number;
  recentActivityScore: number;
  recentActivityLabel: string;
}

export interface ProjectStats {
  totalIssues: number;
  assignedIssues: number;
  unassignedIssues: number;
  deadlineRiskIssues: number;
  problemIssues: number;
  activeMembers: number;
}

export interface DashboardData {
  selectedProjectKey: string;
  projects: ProjectOption[];
  priorities: JiraPrioritySummary[];
  issues: JiraIssueSummary[];
  team: TeamMemberSummary[];
  assignableMembers: JiraUserReference[];
  stats: ProjectStats;
  fetchedAt: string;
}

export interface DashboardPayload {
  projectKey?: string;
}

export interface AssignIssuePayload {
  projectKey: string;
  issueId: string;
  accountId: string;
}

export interface RaisePriorityPayload {
  projectKey: string;
  issueId: string;
  priorityId: string;
  priorityName: string;
}

export interface AutoAssignAssignment {
  issueId: string;
  accountId: string;
}

export interface AutoAssignPayload {
  projectKey: string;
  assignments?: AutoAssignAssignment[];
}

export interface IssueMutationResult {
  issue: JiraIssueSummary;
  message: string;
}

export interface AutoAssignResult {
  updatedIssues: JiraIssueSummary[];
  message: string;
}
