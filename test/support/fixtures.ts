import type { JevRoutingResponse } from "../../src/jev.ts"

/** Exposed for tests: a full routing response fixture. */
export function makeDecisionFixture(
    overrides: Partial<JevRoutingResponse> = {},
): JevRoutingResponse {
    return {
        model: "typesafe/jev-1.13",
        id: "dec_test",
        provider: "openrouter",
        usage: { input_tokens: 1200, output_tokens: 96, cost: 0.0000024 },
        answers: {
            model_tier: { type: "choice", choice: "powerful", confidence: 0.93 },
            reasoning_complexity: { type: "choice", choice: "high", confidence: 0.88 },
            task_scope: { type: "choice", choice: "multi", confidence: 0.81 },
            ambiguity: { type: "choice", choice: "medium", confidence: 0.7 },
            task_type: { type: "choice", choice: "implementation", confidence: 0.9 },
            effort: { type: "choice", choice: "high", confidence: 0.85 },
        },
        ...overrides,
    }
}
