import { useEffect, useState, startTransition } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import type { JiraIssueSummary } from "@shared/types";
import { AutoAssignDialog } from "@/components/AutoAssignDialog";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IssueFixDialog } from "@/components/IssueFixDialog";
import { IssueTable } from "@/components/IssueTable";
import { TeamTab } from "@/components/TeamTab";
import { useAppStore } from "@/store/appStore";

let initialDashboardRequested = false;

export default function App() {
  const dashboard = useAppStore((state) => state.dashboard);
  const activeTab = useAppStore((state) => state.activeTab);
  const bootstrapping = useAppStore((state) => state.bootstrapping);
  const refreshing = useAppStore((state) => state.refreshing);
  const autoAssignLoading = useAppStore((state) => state.autoAssignLoading);
  const actionLoading = useAppStore((state) => state.actionLoading);
  const mutationError = useAppStore((state) => state.mutationError);
  const successMessage = useAppStore((state) => state.successMessage);
  const loadDashboard = useAppStore((state) => state.loadDashboard);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const clearMessages = useAppStore((state) => state.clearMessages);
  const assignIssue = useAppStore((state) => state.assignIssue);
  const raisePriority = useAppStore((state) => state.raisePriority);
  const autoAssignUnassigned = useAppStore((state) => state.autoAssignUnassigned);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);

  useEffect(() => {
    if (initialDashboardRequested) {
      return;
    }

    initialDashboardRequested = true;
    void loadDashboard();
  }, [loadDashboard]);

  const selectedIssue: JiraIssueSummary | null =
    dashboard?.issues.find((issue) => issue.id === selectedIssueId) ?? null;

  useEffect(() => {
    if (selectedIssueId && (!selectedIssue || selectedIssue.problems.length === 0)) {
      setSelectedIssueId(null);
    }
  }, [selectedIssueId, selectedIssue]);

  if (bootstrapping && !dashboard) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading Jira project data...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
        <Stack spacing={2} alignItems="center">
          <Alert severity="error">
            {mutationError ?? "The dashboard could not be loaded."}
          </Alert>
          <Button variant="contained" onClick={() => void loadDashboard()}>
            Retry loading
          </Button>
        </Stack>
      </Box>
    );
  }

  const activeAssignableMembers = dashboard.assignableMembers.filter((member) => member.active).length;
  const unassignedIssues = dashboard.issues.filter((issue) => issue.problems.includes("UNASSIGNED")).length;
  const autoAssignDisabled = unassignedIssues === 0 || activeAssignableMembers === 0;

  return (
    <Box sx={{ minHeight: "100vh", py: { xs: 2, md: 3 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
        <Stack spacing={2.25}>
          {refreshing ? <LinearProgress sx={{ borderRadius: 999 }} /> : null}

          <DashboardHeader
            dashboard={dashboard}
            refreshing={refreshing}
            autoAssignLoading={autoAssignLoading}
            autoAssignDisabled={autoAssignDisabled}
            onProjectChange={(projectKey) => {
              startTransition(() => {
                void loadDashboard(projectKey);
              });
            }}
            onAutoAssign={() => setAutoAssignOpen(true)}
          />

          <Paper sx={{ overflow: "hidden" }}>
            <Tabs
              value={activeTab}
              onChange={(_, value) => {
                startTransition(() => {
                  setActiveTab(value);
                });
              }}
              sx={{ px: 2, pt: 1 }}
            >
              <Tab value="issues" label={`Issues (${dashboard.issues.length})`} />
              <Tab value="team" label={`Team (${dashboard.team.length})`} />
            </Tabs>

            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              {activeTab === "issues" ? (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Last synced {dayjs(dashboard.fetchedAt).format("DD MMM YYYY, HH:mm")}
                  </Typography>
                  <IssueTable
                    issues={dashboard.issues}
                    actionLoading={actionLoading}
                    onFix={(issueId) => setSelectedIssueId(issueId)}
                  />
                </Stack>
              ) : (
                <TeamTab team={dashboard.team} />
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>

      <IssueFixDialog
        open={Boolean(selectedIssue)}
        issue={selectedIssue}
        team={dashboard.team}
        assignableMembers={dashboard.assignableMembers}
        assignLoading={Boolean(selectedIssue && actionLoading[`assign:${selectedIssue.id}`])}
        priorityLoading={Boolean(selectedIssue && actionLoading[`priority:${selectedIssue.id}`])}
        onClose={() => setSelectedIssueId(null)}
        onAssign={async (accountId) => {
          if (!selectedIssue) {
            return;
          }

          await assignIssue(selectedIssue.id, accountId);
        }}
        onRaisePriority={async (priority) => {
          if (!selectedIssue) {
            return;
          }

          await raisePriority(selectedIssue.id, priority);
        }}
      />

      <AutoAssignDialog
        open={autoAssignOpen}
        issueCount={unassignedIssues}
        memberCount={activeAssignableMembers}
        loading={autoAssignLoading}
        onClose={() => setAutoAssignOpen(false)}
        onConfirm={async () => {
          await autoAssignUnassigned();
          setAutoAssignOpen(false);
        }}
      />

      <Snackbar
        open={Boolean(mutationError)}
        autoHideDuration={5000}
        onClose={clearMessages}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="error" onClose={clearMessages} variant="filled">
          {mutationError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3500}
        onClose={clearMessages}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={clearMessages} variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
