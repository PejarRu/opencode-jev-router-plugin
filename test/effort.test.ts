import { describe, expect, test } from "bun:test"
import { type ChoiceConfig, normalizeConfig, type PluginConfig } from "../src/config.ts"
import { type JsonStorage, saveDecision } from "../src/decision.ts"
import { type ContextEvent, createEffortHook, effortProviders } from "../src/effort.ts"
import { noopLogger } from "../src/logger.ts"
import {
    createRouterHarness,
    FakeStorage,
    makePromptEvent,
    makeStoredDecision,
} from "./support/harness.ts"

const ROUTED: ChoiceConfig = { provider: "openrouter", model: "deepseek/deepseek-v4-pro-0813" }

function event(model: ChoiceConfig = ROUTED, options: Record<string, unknown> = {}): ContextEvent {
    return {
        sessionID: "ses_test",
        model: { providerID: model.provider, id: model.model },
        options,
    }
}

async function hook(
    config: PluginConfig = {},
    resolved: ChoiceConfig | undefined = ROUTED,
    storage: JsonStorage = new FakeStorage(),
) {
    await saveDecision(storage, makeStoredDecision("ses_test", { resolved }))
    return createEffortHook({ config: normalizeConfig(config), logger: noopLogger, storage })
}

describe("effort hook", () => {
    test("sets the OpenRouter option on the routed model", async () => {
        const onContext = await hook()
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({ reasoning_effort: "high" })
    })

    test("uses the OpenAI option key for OpenAI models", async () => {
        const openai = { provider: "openai", model: "gpt-5.2" }
        const onContext = await hook({}, openai)
        const call = event(openai)

        await onContext(call)

        expect(call.options).toEqual({ reasoningEffort: "high" })
    })

    test("maps effort values", async () => {
        const onContext = await hook({ reasoningEffort: { values: { high: "xhigh" } } })
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({ reasoning_effort: "xhigh" })
    })

    test("ignores providers without an option key", async () => {
        const anthropic = { provider: "anthropic", model: "claude-builder" }
        const onContext = await hook({}, anthropic)
        const call = event(anthropic)

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("ignores providers disabled with an empty option key", async () => {
        const onContext = await hook({ reasoningEffort: { providers: { openrouter: "" } } })
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("does nothing without a stored decision", async () => {
        const onContext = createEffortHook({
            config: normalizeConfig({}),
            logger: noopLogger,
            storage: new FakeStorage(),
        })
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("does nothing when the call's model is not the routed model", async () => {
        const onContext = await hook()
        const call = event({ provider: "openrouter", model: "z-ai/glm-5.3-flash" })

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("does nothing when the router kept the session model", async () => {
        const storage = new FakeStorage()
        await saveDecision(storage, makeStoredDecision("ses_test", { resolved: undefined }))
        const onContext = createEffortHook({
            config: normalizeConfig({}),
            logger: noopLogger,
            storage,
        })
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("keeps a value set by an earlier hook", async () => {
        const onContext = await hook()
        const call = event(ROUTED, { reasoning_effort: "low" })

        await onContext(call)

        expect(call.options).toEqual({ reasoning_effort: "low" })
    })

    test("does not apply a stale decision after a skipped prompt", async () => {
        const harness = createRouterHarness({})
        await harness.prompt(makePromptEvent())

        await harness.prompt(makePromptEvent({ text: "hi" }))

        const onContext = createEffortHook({
            config: normalizeConfig({}),
            logger: noopLogger,
            storage: harness.storage,
        })
        const call = event()

        await onContext(call)

        expect(call.options).toEqual({})
    })

    test("never throws when storage fails", async () => {
        const onContext = createEffortHook({
            config: normalizeConfig({}),
            logger: noopLogger,
            storage: {
                get: async () => {
                    throw new Error("storage down")
                },
                set: async () => {},
            },
        })

        await expect(onContext(event())).resolves.toBeUndefined()
    })
})

describe("effortProviders", () => {
    test("lists providers with a non-empty option key", () => {
        expect(effortProviders(normalizeConfig({}))).toEqual(["openrouter", "openai"])
        expect(
            effortProviders(
                normalizeConfig({ reasoningEffort: { providers: { openai: "", xai: "effort" } } }),
            ),
        ).toEqual(["openrouter", "xai"])
    })
})
