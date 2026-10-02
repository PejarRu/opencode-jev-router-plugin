import { describe, expect, test } from "bun:test"
import { addUsage, getUsage, usageKey } from "../src/usage.ts"
import { FakeStorage } from "./support/harness.ts"

const usage = { input_tokens: 100, output_tokens: 10, cost: 0.001 }

describe("usage", () => {
    test("starts at zero", async () => {
        expect(await getUsage(new FakeStorage(), "ses_1")).toEqual({
            cost: 0,
            inputTokens: 0,
            outputTokens: 0,
            requests: 0,
        })
    })

    test("accumulates per session", async () => {
        const storage = new FakeStorage()

        await addUsage(storage, "ses_1", "msg_1", usage)
        await addUsage(storage, "ses_1", "msg_2", usage)
        await addUsage(storage, "ses_2", "msg_1", usage)

        expect(await getUsage(storage, "ses_1")).toEqual({
            cost: 0.002,
            inputTokens: 200,
            outputTokens: 20,
            requests: 2,
            lastMessageID: "msg_2",
        })
        expect((await getUsage(storage, "ses_2")).requests).toBe(1)
    })

    test("counts a message once when the prompt hook re-runs", async () => {
        const storage = new FakeStorage()

        await addUsage(storage, "ses_1", "msg_1", usage)
        await addUsage(storage, "ses_1", "msg_1", usage)

        expect((await getUsage(storage, "ses_1")).requests).toBe(1)
    })

    test("treats corrupt values as zero", async () => {
        const storage = new FakeStorage()
        await storage.set(usageKey("ses_1"), {
            cost: "x",
            inputTokens: null,
            outputTokens: Number.NaN,
            requests: 3,
            lastMessageID: 7,
        })

        expect(await getUsage(storage, "ses_1")).toEqual({
            cost: 0,
            inputTokens: 0,
            outputTokens: 0,
            requests: 3,
        })
    })
})
