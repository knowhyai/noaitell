/** Product boundary: these flags describe future packaging only. v1 never gates functionality. */
export const features = {
  coreScan: { available: true, tier: 'free' },
  coreCleanup: { available: true, tier: 'free' },
  batchProcessing: { available: false, tier: 'premium-ready' },
  experimentalRulePacks: { available: false, tier: 'premium-ready' },
  higherTextLimits: { available: false, tier: 'premium-ready' },
} as const;
