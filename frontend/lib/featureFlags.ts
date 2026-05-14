function readBoolean(value: string | undefined, fallback: boolean) {
    if (value === undefined) return fallback;
    return value === '1' || value === 'true' || value === 'TRUE';
}

export const FEATURE_FLAGS = {
    reportGenerationV2: readBoolean(process.env.NEXT_PUBLIC_FEATURE_REPORT_GENERATION_V2, true),
    diffLearning: readBoolean(process.env.NEXT_PUBLIC_FEATURE_DIFF_LEARNING, false),
    styleProfileRebuild: readBoolean(process.env.NEXT_PUBLIC_FEATURE_STYLE_PROFILE_REBUILD, false),
};
