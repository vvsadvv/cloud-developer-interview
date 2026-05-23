import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e"
    },
    secondary: {
      main: "#f59e0b"
    },
    background: {
      default: "#f4f7f3",
      paper: "#fcfdf9"
    },
    error: {
      main: "#c2410c"
    },
    warning: {
      main: "#d97706"
    },
    success: {
      main: "#15803d"
    }
  },
  shape: {
    borderRadius: 18
  },
  typography: {
    fontFamily: [
      "\"Segoe UI Variable Display\"",
      "Bahnschrift",
      "\"Segoe UI\"",
      "sans-serif"
    ].join(","),
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.03em"
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em"
    },
    h6: {
      fontWeight: 700
    },
    button: {
      fontWeight: 700,
      textTransform: "none"
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 32%), radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 28%), linear-gradient(180deg, #f7faf7 0%, #eef5f0 100%)"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 22px 60px rgba(15, 23, 42, 0.08)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});
