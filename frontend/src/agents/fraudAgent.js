// ─────────────────────────────────────────────────────────────────
//  Tahseen Fraud Agent — thin wrapper over apiAnalyze
// ─────────────────────────────────────────────────────────────────

import { apiAnalyze } from '../api/client'

export async function analyzeTransfer(params) {
  try {
    const result = await apiAnalyze(params)
    // Normalise fields for consistency
    const score = Math.min(Math.max(result.riskScore || 50, 0), 100)
    return {
      riskScore: score,
      riskLevel: result.riskLevel || 'medium',
      recommendation: result.recommendation || (score > 65 ? 'block' : 'allow'),
      reasoning: result.reasoning || result.reason || '',
      redFlags: result.redFlags || [],
      predictions: result.predictions || [],
    }
  } catch {
    return {
      riskScore: 50,
      riskLevel: 'medium',
      recommendation: 'warn',
      reasoning: 'تعذّر التحليل — تصرف بحذر.',
      redFlags: [],
      predictions: [],
    }
  }
}
