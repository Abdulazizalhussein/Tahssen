export const theme = {
  bg: '#001520',
  bgCard: '#002134',
  bgCardLight: '#00334d',
  gold: '#C9A227',
  teal: '#00857A',
  tealLight: '#00A896',
  danger: '#D93025',
  warning: '#F5A623',
  success: '#1A7F5A',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.60)',
  textHint: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.12)',
  radius: 14,
  radiusLg: 20,
  radiusXl: 24,
}

export const riskColor = (level) => {
  switch (level) {
    case 'critical':
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
