export const DASHBOARD_VIEW_STATE_KEY = 'backer-sonar-dashboard-href'
export const REPORTS_VIEW_STATE_KEY = 'backer-sonar-reports-href'
export const ADMIN_VIEW_STATE_KEY = 'backer-sonar-admin-href'

export function getViewStateKey(pathname: string) {
  if (pathname.startsWith('/dashboard')) return DASHBOARD_VIEW_STATE_KEY
  if (pathname.startsWith('/reports')) return REPORTS_VIEW_STATE_KEY
  if (pathname.startsWith('/admin')) return ADMIN_VIEW_STATE_KEY
  return null
}
