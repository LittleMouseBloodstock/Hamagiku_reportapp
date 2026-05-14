export type Plan = 'basic' | 'pro' | 'premium';

export type PlanCapabilities = {
    canUseGenerateV2: boolean;
    canUseAudienceRouting: boolean;
    canUseStyleMemory: boolean;
    canStoreEditDiffs: boolean;
    canAutoLearnFromDiffs: boolean;
    canRebuildStyleProfile: boolean;
    canUseWeightBulkInput: boolean;
    canUseTrainerManagement: boolean;
    canUseVetRecords: boolean;
    canUseFarrierRecords: boolean;
    canUseDepartureReports: boolean;
    canUseTwoPageMedicalPdf: boolean;
};

export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
    basic: {
        canUseGenerateV2: false,
        canUseAudienceRouting: false,
        canUseStyleMemory: false,
        canStoreEditDiffs: false,
        canAutoLearnFromDiffs: false,
        canRebuildStyleProfile: false,
        canUseWeightBulkInput: false,
        canUseTrainerManagement: false,
        canUseVetRecords: false,
        canUseFarrierRecords: false,
        canUseDepartureReports: false,
        canUseTwoPageMedicalPdf: false,
    },
    pro: {
        canUseGenerateV2: true,
        canUseAudienceRouting: true,
        canUseStyleMemory: false,
        canStoreEditDiffs: true,
        canAutoLearnFromDiffs: false,
        canRebuildStyleProfile: false,
        canUseWeightBulkInput: true,
        canUseTrainerManagement: true,
        canUseVetRecords: false,
        canUseFarrierRecords: false,
        canUseDepartureReports: false,
        canUseTwoPageMedicalPdf: false,
    },
    premium: {
        canUseGenerateV2: true,
        canUseAudienceRouting: true,
        canUseStyleMemory: true,
        canStoreEditDiffs: true,
        canAutoLearnFromDiffs: true,
        canRebuildStyleProfile: true,
        canUseWeightBulkInput: true,
        canUseTrainerManagement: true,
        canUseVetRecords: true,
        canUseFarrierRecords: true,
        canUseDepartureReports: true,
        canUseTwoPageMedicalPdf: true,
    },
};

export function normalizePlan(plan?: string | null): Plan {
    if (plan === 'pro' || plan === 'premium' || plan === 'basic') return plan;
    return 'basic';
}

export function getPlanCapabilities(plan?: string | null): PlanCapabilities {
    return PLAN_CAPABILITIES[normalizePlan(plan)];
}
