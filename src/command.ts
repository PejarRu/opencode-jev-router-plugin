import { type JsonStorage, loadDecision } from "./decision.ts"
import { describeStatus, formatStatus } from "./display.ts"
import type { Logger } from "./logger.ts"
import { getUsage } from "./usage.ts"

export interface StatusCommandDeps {
    storage: JsonStorage
    logger: Logger
    session: {
        synthetic(input: {
            sessionID: string
            text: string
            description?: string
            resume?: boolean
        }): Promise<unknown>
    }
}

export interface StatusCommand {
    name: string
    description: string
    execute(input: { sessionID: string }): Promise<void>
}

export function createStatusCommand({
    storage,
    logger,
    session,
}: StatusCommandDeps): StatusCommand {
    return {
        name: "jev",
        description: "Show JEV router usage and the last routing decision for this session",
        async execute({ sessionID }) {
            try {
                const [decision, usage] = await Promise.all([
                    loadDecision(storage, sessionID),
                    getUsage(storage, sessionID),
                ])
                await session.synthetic({
                    sessionID,
                    text: formatStatus(decision, usage),
                    description: describeStatus(decision, usage),
                    resume: false,
                })
            } catch (error) {
                logger.error("/jev failed:", error)
            }
        },
    }
}
