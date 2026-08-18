export const CURRENCY_NORMALIZATION_VERSION = 'kickstarter-source-rates-v1'

function toPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function normalizeCampaignMoney(input) {
  const nativeCurrency = input.currency?.trim().toUpperCase() || null
  const currentCurrency = input.currentCurrency?.trim().toUpperCase() || null
  const nativeGoal = toNumber(input.goal)
  const nativePledged = toNumber(input.pledged)
  const sourceUsdPledged = toNumber(input.usdPledged)
  const convertedPledged = toNumber(input.convertedPledgedAmount)
  const staticUsdRate = toPositiveNumber(input.staticUsdRate)

  let usdRate = null
  let rateSource = 'unavailable'
  let rateConfidence = 'unavailable'

  if (nativeCurrency === 'USD') {
    usdRate = 1
    rateSource = 'native_usd'
    rateConfidence = 'high'
  } else if (staticUsdRate !== null) {
    usdRate = staticUsdRate
    rateSource = 'static_usd_rate'
    rateConfidence = 'high'
  } else if (
    nativePledged !== null &&
    nativePledged > 0 &&
    sourceUsdPledged !== null
  ) {
    usdRate = sourceUsdPledged / nativePledged
    rateSource = 'usd_pledged_ratio'
    rateConfidence = 'medium'
  } else if (
    nativePledged !== null &&
    nativePledged > 0 &&
    convertedPledged !== null &&
    currentCurrency === 'USD'
  ) {
    usdRate = convertedPledged / nativePledged
    rateSource = 'converted_pledged_ratio'
    rateConfidence = 'low'
  }

  return {
    normalizationVersion: CURRENCY_NORMALIZATION_VERSION,
    nativeCurrency,
    nativeGoal,
    nativePledged,
    usdRate,
    usdGoal: nativeGoal !== null && usdRate !== null ? nativeGoal * usdRate : null,
    usdPledged:
      nativePledged !== null && usdRate !== null ? nativePledged * usdRate : null,
    rateSource,
    rateConfidence,
    currentCurrency,
  }
}
