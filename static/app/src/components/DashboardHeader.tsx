import { Avatar, Box, Button, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import type { DashboardData } from "@shared/types";

interface DashboardHeaderProps {
  dashboard: DashboardData;
  refreshing: boolean;
  autoAssignLoading: boolean;
  autoAssignDisabled: boolean;
  onProjectChange: (projectKey: string) => void;
  onAutoAssign: () => void;
}

const statCards = [
  {
    key: "totalIssues",
    label: "Total issues",
    accent: "rgba(15, 118, 110, 0.12)",
    icon: <FolderRoundedIcon fontSize="small" />
  },
  {
    key: "problemIssues",
    label: "Need attention",
    accent: "rgba(194, 65, 12, 0.12)",
    icon: <ReportProblemRoundedIcon fontSize="small" />
  },
  {
    key: "assignedIssues",
    label: "Assigned",
    accent: "rgba(21, 128, 61, 0.12)",
    icon: <AssignmentTurnedInRoundedIcon fontSize="small" />
  },
  {
    key: "activeMembers",
    label: "Active teammates",
    accent: "rgba(245, 158, 11, 0.12)",
    icon: <Groups2RoundedIcon fontSize="small" />
  }
] as const;

export function DashboardHeader({
  dashboard,
  refreshing,
  autoAssignLoading,
  autoAssignDisabled,
  onProjectChange,
  onAutoAssign
}: DashboardHeaderProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          xl: "minmax(0, 1.6fr) minmax(300px, 0.8fr)"
        },
        gap: 2
      }}
    >
      <Paper
        sx={{
          p: { xs: 2.5, md: 3 },
          overflow: "hidden",
          position: "relative"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(252,253,249,0) 42%), linear-gradient(225deg, rgba(245,158,11,0.12) 0%, rgba(252,253,249,0) 40%)",
            pointerEvents: "none"
          }}
        />
        <Stack spacing={2.5} sx={{ position: "relative" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.12em" }}>
                Forge project page
              </Typography>
              <Typography variant="h4">Jira Project Assistant</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mt: 0.75 }}>
                Spot unassigned work, deadline risks, and team load from one focused dashboard.
              </Typography>
            </Box>
            <Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={1}>
              <Chip
                color={refreshing ? "secondary" : "primary"}
                label={refreshing ? "Refreshing data" : `Project ${dashboard.selectedProjectKey}`}
                variant={refreshing ? "filled" : "outlined"}
              />
              <Typography variant="body2" color="text.secondary">
                {dashboard.projects.length} accessible project(s)
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))"
              },
              gap: 1.5
            }}
          >
            {statCards.map((card) => (
              <Paper
                key={card.key}
                variant="outlined"
                sx={{
                  p: 1.75,
                  bgcolor: "rgba(252, 253, 249, 0.85)",
                  borderColor: "rgba(15, 23, 42, 0.08)"
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      {dashboard.stats[card.key]}
                    </Typography>
                  </Box>
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: card.accent,
                      color: "text.primary",
                      width: 42,
                      height: 42
                    }}
                  >
                    {card.icon}
                  </Avatar>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="project-select-label">Project</InputLabel>
          <Select
            labelId="project-select-label"
            label="Project"
            value={dashboard.selectedProjectKey}
            onChange={(event) => onProjectChange(event.target.value)}
          >
            {dashboard.projects.map((project) => (
              <MenuItem key={project.id} value={project.key}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Avatar src={project.avatarUrl} sx={{ width: 28, height: 28 }}>
                    {project.key[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{project.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.key}
                    </Typography>
                  </Box>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack spacing={1}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AutoFixHighRoundedIcon />}
            onClick={onAutoAssign}
            disabled={autoAssignLoading || autoAssignDisabled}
          >
            {autoAssignLoading ? "Assigning issues..." : "Auto-assign unassigned"}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Randomly distributes every unassigned issue across active project members.
          </Typography>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            bgcolor: "rgba(15, 118, 110, 0.05)",
            borderColor: "rgba(15, 118, 110, 0.14)"
          }}
        >
          <Typography variant="subtitle2">Live risk snapshot</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {dashboard.stats.unassignedIssues} unassigned and {dashboard.stats.deadlineRiskIssues} low-priority
            issue(s) are currently close to deadline.
          </Typography>
        </Paper>
      </Paper>
    </Box>
  );
}
