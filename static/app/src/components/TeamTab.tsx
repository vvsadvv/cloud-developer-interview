import { Avatar, Box, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import type { TeamMemberSummary } from "@shared/types";

interface TeamTabProps {
  team: TeamMemberSummary[];
}

export function TeamTab({ team }: TeamTabProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(2, minmax(0, 1fr))",
          xl: "repeat(3, minmax(0, 1fr))"
        },
        gap: 2
      }}
    >
      {team.map((member) => (
        <Paper key={member.accountId} sx={{ p: 2.25 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={member.avatarUrl} sx={{ width: 42, height: 42 }}>
                {member.displayName[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">{member.displayName}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    color={member.active ? "success" : "default"}
                    label={member.active ? "Active" : "Inactive"}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${member.assignedIssueCount} issue(s)`}
                  />
                </Stack>
              </Box>
            </Stack>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                <Typography variant="body2" color="text.secondary">
                  Activity score
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {member.recentActivityScore} / 100
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={member.recentActivityScore}
                color={member.recentActivityScore >= 80 ? "success" : member.recentActivityScore >= 50 ? "warning" : "primary"}
                sx={{ height: 10, borderRadius: 999 }}
              />
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: "rgba(15, 118, 110, 0.04)",
                borderColor: "rgba(15, 118, 110, 0.12)"
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Recent activity
              </Typography>
              <Typography variant="subtitle1" sx={{ mt: 0.5 }}>
                {member.recentActivityLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {member.recentUpdatedIssueCount} assigned issue(s) updated within the last 14 days.
              </Typography>
            </Paper>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
