import { create } from "zustand";
import type { DashboardData, DashboardTab, PrioritySuggestion } from "@shared/types";
import { forgeApi } from "@/api/forge";
import {
  createAutoAssignments,
  getErrorMessage,
  recomputeDashboard,
  replaceIssue,
  withOptimisticAssignee,
  withOptimisticPriority
} from "@/utils/issues";

type ActionLoadingMap = Record<string, boolean>;

interface LoadDashboardOptions {
  silent?: boolean;
}

interface AppStore {
  dashboard: DashboardData | null;
  activeTab: DashboardTab;
  bootstrapping: boolean;
  refreshing: boolean;
  autoAssignLoading: boolean;
  actionLoading: ActionLoadingMap;
  mutationError: string | null;
  successMessage: string | null;
  setActiveTab: (tab: DashboardTab) => void;
  clearMessages: () => void;
  loadDashboard: (projectKey?: string, options?: LoadDashboardOptions) => Promise<void>;
  assignIssue: (issueId: string, accountId: string) => Promise<void>;
  raisePriority: (issueId: string, priority: PrioritySuggestion) => Promise<void>;
  autoAssignUnassigned: () => Promise<void>;
}

function issueActionKey(action: "assign" | "priority", issueId: string): string {
  return `${action}:${issueId}`;
}

function removeActionKey(source: ActionLoadingMap, key: string): ActionLoadingMap {
  const next = { ...source };
  delete next[key];
  return next;
}

export const useAppStore = create<AppStore>((set, get) => ({
  dashboard: null,
  activeTab: "issues",
  bootstrapping: true,
  refreshing: false,
  autoAssignLoading: false,
  actionLoading: {},
  mutationError: null,
  successMessage: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearMessages: () => set({ mutationError: null, successMessage: null }),
  loadDashboard: async (projectKey, options) => {
    const hasDashboard = Boolean(get().dashboard);

    set(
      options?.silent || hasDashboard
        ? { refreshing: true, mutationError: null }
        : { bootstrapping: true, mutationError: null }
    );

    try {
      const dashboard = await forgeApi.getDashboard(projectKey ? { projectKey } : {});
      set({
        dashboard,
        bootstrapping: false,
        refreshing: false,
        mutationError: null
      });
    } catch (error) {
      set({
        bootstrapping: false,
        refreshing: false,
        mutationError: getErrorMessage(error)
      });
    }
  },
  assignIssue: async (issueId, accountId) => {
    const dashboard = get().dashboard;

    if (!dashboard) {
      return;
    }

    const issue = dashboard.issues.find((item) => item.id === issueId);
    const member = dashboard.assignableMembers.find((item) => item.accountId === accountId);

    if (!issue || !member) {
      return;
    }

    const key = issueActionKey("assign", issueId);
    const previousDashboard = dashboard;
    const optimisticDashboard = recomputeDashboard({
      ...dashboard,
      issues: dashboard.issues.map((item) =>
        item.id === issueId ? withOptimisticAssignee(item, member, dashboard.priorities) : item
      )
    });

    set((state) => ({
      dashboard: optimisticDashboard,
      actionLoading: {
        ...state.actionLoading,
        [key]: true
      },
      mutationError: null,
      successMessage: null
    }));

    try {
      const result = await forgeApi.assignIssue({
        projectKey: dashboard.selectedProjectKey,
        issueId,
        accountId
      });

      set((state) => ({
        dashboard: state.dashboard
          ? recomputeDashboard({
              ...state.dashboard,
              issues: replaceIssue(state.dashboard.issues, result.issue)
            })
          : state.dashboard,
        actionLoading: removeActionKey(state.actionLoading, key),
        successMessage: result.message
      }));

      await get().loadDashboard(dashboard.selectedProjectKey, { silent: true });
    } catch (error) {
      set((state) => ({
        dashboard: previousDashboard,
        actionLoading: removeActionKey(state.actionLoading, key),
        mutationError: getErrorMessage(error)
      }));
    }
  },
  raisePriority: async (issueId, priority) => {
    const dashboard = get().dashboard;

    if (!dashboard) {
      return;
    }

    const issue = dashboard.issues.find((item) => item.id === issueId);

    if (!issue) {
      return;
    }

    const key = issueActionKey("priority", issueId);
    const previousDashboard = dashboard;
    const nextPriority = dashboard.priorities.find((candidate) => candidate.id === priority.id);

    if (!nextPriority) {
      set({ mutationError: `Priority "${priority.name}" is not available in this Jira project.` });
      return;
    }

    const optimisticDashboard = recomputeDashboard({
      ...dashboard,
      issues: dashboard.issues.map((item) =>
        item.id === issueId ? withOptimisticPriority(item, nextPriority, dashboard.priorities) : item
      )
    });

    set((state) => ({
      dashboard: optimisticDashboard,
      actionLoading: {
        ...state.actionLoading,
        [key]: true
      },
      mutationError: null,
      successMessage: null
    }));

    try {
      const result = await forgeApi.raisePriority({
        projectKey: dashboard.selectedProjectKey,
        issueId,
        priorityId: priority.id,
        priorityName: priority.name
      });

      set((state) => ({
        dashboard: state.dashboard
          ? recomputeDashboard({
              ...state.dashboard,
              issues: replaceIssue(state.dashboard.issues, result.issue)
            })
          : state.dashboard,
        actionLoading: removeActionKey(state.actionLoading, key),
        successMessage: result.message
      }));

      await get().loadDashboard(dashboard.selectedProjectKey, { silent: true });
    } catch (error) {
      set((state) => ({
        dashboard: previousDashboard,
        actionLoading: removeActionKey(state.actionLoading, key),
        mutationError: getErrorMessage(error)
      }));
    }
  },
  autoAssignUnassigned: async () => {
    const dashboard = get().dashboard;

    if (!dashboard) {
      return;
    }

    const activeMembers = dashboard.assignableMembers.filter((member) => member.active);

    if (activeMembers.length === 0) {
      set({ mutationError: "No active project members are available for automatic assignment." });
      return;
    }

    const assignments = createAutoAssignments(dashboard.issues, dashboard.assignableMembers);

    if (assignments.length === 0) {
      set({ successMessage: "There are no unassigned issues to process." });
      return;
    }

    const previousDashboard = dashboard;
    const optimisticDashboard = recomputeDashboard({
      ...dashboard,
      issues: dashboard.issues.map((issue) => {
        const assignment = assignments.find((item) => item.issueId === issue.id);
        const member = dashboard.assignableMembers.find(
          (assignableMember) => assignableMember.accountId === assignment?.accountId
        );

        return assignment && member
          ? withOptimisticAssignee(issue, member, dashboard.priorities)
          : issue;
      })
    });

    set({
      dashboard: optimisticDashboard,
      autoAssignLoading: true,
      mutationError: null,
      successMessage: null
    });

    try {
      const result = await forgeApi.autoAssignUnassigned({
        projectKey: dashboard.selectedProjectKey,
        assignments
      });

      set((state) => ({
        dashboard: state.dashboard
          ? recomputeDashboard({
              ...state.dashboard,
              issues: state.dashboard.issues.map((issue) => {
                const updated = result.updatedIssues.find((candidate) => candidate.id === issue.id);
                return updated ?? issue;
              })
            })
          : state.dashboard,
        autoAssignLoading: false,
        successMessage: result.message
      }));

      await get().loadDashboard(dashboard.selectedProjectKey, { silent: true });
    } catch (error) {
      set({
        dashboard: previousDashboard,
        autoAssignLoading: false,
        mutationError: getErrorMessage(error)
      });
    }
  }
}));
