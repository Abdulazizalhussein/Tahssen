export const theme = {
  bg: '#001a2e',
  bgCard: '#002134',
  bgCardLight: '#003a5c',
  gold: '#C9A227',
  teal: '#00A896',
  danger: '#E53E3E',
  warning: '#ED8936',
  success: '#38A169',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  textHint: 'rgba(255,255,255,0.3)',
  border: 'rgba(255,255,255,0.08)',
  radius: 12,
  radiusLg: 20,
}

export const riskColor = (level) => {
  switch (level) {
    case 'critical':
      return theme.danger
    case 'high':
      return theme.danger
    case 'medium':
      return theme.warning
    case 'low':
    default:
      return theme.success
  }
}

export const riskColorByScore = (score) => {
  if (score >= 75) return theme.danger
  if (score >= 45) return theme.warning
  return theme.success
}

export const colors = theme
export default theme
