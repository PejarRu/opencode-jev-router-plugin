import type { JsonStorage } from "./decision.ts"
import type { JevRoutingResponse } from "./jev.ts"

export interface JevUsageStats {
    /** Cumulative classifier cost in USD. */
    cost: number
    inputTokens: number
    outputTokens: number
    requests: number
    /** Last counted message; makes `addUsage` idempotent across hook re-runs. */
    lastMessageID?: string
}

export function usageKey(sessionID: string): string {
    return `jev/usage/${sessionID}`
}

function count(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export async function getUsage(storage: JsonStorage, sessionID: string): Promise<JevUsageStats> {
    const raw = await storage.get(usageKey(sessionID))
    const stored = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
    const stats: JevUsageStats = {
        cost: count(stored.cost),
        inputTokens: count(stored.inputTokens),
        outputTokens: count(stored.outputTokens),
        requests: count(stored.requests),
    }
    if (typeof stored.lastMessageID === "string") {
        stats.lastMessageID = stored.lastMessageID
    }
    return stats
}

export async function addUsage(
    storage: JsonStorage,
    sessionID: string,
    messageID: string,
    usage: JevRoutingResponse["usage"],
): Promise<JevUsageStats> {
    const previous = await getUsage(storage, sessionID)
    if (previous.lastMessageID === messageID) {
        return previous
    }
    const next: JevUsageStats = {
        cost: previous.cost + usage.cost,
        inputTokens: previous.inputTokens + usage.input_tokens,
        outputTokens: previous.outputTokens + usage.output_tokens,
        requests: previous.requests + 1,
        lastMessageID: messageID,
    }
    await storage.set(usageKey(sessionID), next)
    return next
}
