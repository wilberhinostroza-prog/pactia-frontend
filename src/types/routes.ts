export type PactiaRoutes = {
  index: undefined;
  login: undefined;
  register: undefined;
  'complete-profile': undefined;
  home: undefined;
  'new-contract': undefined;
  history: undefined;
  profile: undefined;
};

// Helper para navegación tipada
export const ROUTES = {
  HOME: '/home' as const,
  LOGIN: '/login' as const,
  REGISTER: '/register' as const,
  COMPLETE_PROFILE: '/complete-profile' as const,
  NEW_CONTRACT: '/new-contract' as const,
  HISTORY: '/history' as const,
  PROFILE: '/profile' as const,
};