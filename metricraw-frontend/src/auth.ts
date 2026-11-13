const ACCESS = 'metricraw_access'
const REFRESH = 'metricraw_refresh'

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access)
  localStorage.setItem(REFRESH, refresh)
}

export const getAccess = () => localStorage.getItem(ACCESS)
export const getRefresh = () => localStorage.getItem(REFRESH)

export function clearTokens() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}
