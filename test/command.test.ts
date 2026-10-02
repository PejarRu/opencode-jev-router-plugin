import { describe, expect, test } from "bun:test"
import { createStatusCommand } from "../src/command.ts"
import { saveDecision } from "../src/decision.ts"
import { noopLogger } from "../src/logger.ts"
import { addUsage } from "../src/usage.ts"
import { FakeStorage, makeStoredDecision } from "./support/harness.ts"

type Published = { sessionID: string; text: string; description?: string; resume?: boolean }

describe("/jev command", () => {
    test("publishes the session status", async () => {
        const storage = new FakeStorage()
        await saveDecision(storage, makeStoredDecision())
        await addUsage(storage, "ses_test", "msg_1", {
            input_tokens: 1200,
            output_tokens: 96,
            cost: 0.0000024,
        })
        const published: Published[] = []
        const command = createStatusCommand({
            storage,
            logger: noopLogger,
            session: {
                synthetic: async (input) => {
                    published.push(input)
                },
            },
        })

        expect(command.name).toBe("jev")
        await command.execute({ sessionID: "ses_test" })

        expect(published).toHaveLength(1)
        expect(published[0]).toMatchObject({ sessionID: "ses_test", resume: false })
        expect(published[0]?.text).toContain("requests: 1")
        expect(published[0]?.description).toStartWith("⚡ jev: 1 classifier call ·")
    })

    test("logs instead of throwing when publishing fails", async () => {
        const errors: unknown[][] = []
        const command = createStatusCommand({
            storage: new FakeStorage(),
            logger: { ...noopLogger, error: (...args: unknown[]) => errors.push(args) },
            session: {
                synthetic: async () => {
                    throw new Error("session gone")
                },
            },
        })

        await expect(command.execute({ sessionID: "ses_test" })).resolves.toBeUndefined()
        await Bun.sleep(0)
        expect(errors).toHaveLength(1)
    })
})
