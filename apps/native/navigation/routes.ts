export const appRoutes = {
  home: "/",
  account: "/account",
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
  },
  onboarding: "/(onboarding)",
  ssoCallback: "/sso-callback",
} as const;
