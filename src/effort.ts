import type { RuntimeConfig } from "./config.ts"
import { type JsonStorage, loadDecision } from "./decision.ts"
import type { Logger } from "./logger.ts"

/** Structural subset of OpenCode's context hook event. */
export interface ContextEvent {
    readonly sessionID: string
    readonly model: { readonly providerID: string; readonly id: string }
    options: Record<string, unknown>
}

export interface EffortHookDeps {
    config: RuntimeConfig
    logger: Logger
    storage: JsonStorage
}

/** Providers that get a provider-scoped context hook. */
export function effortProviders(config: RuntimeConfig): string[] {
    return Object.entries(config.reasoningEffort.providers)
        .filter(([, optionKey]) => optionKey !== "")
        .map(([providerID]) => providerID)
}

/**
 * Create the `session.hook("context", ...)` handler. Applies the classifier's
 * effort only to the model the router switched to, never overwrites a value an
 * earlier hook set, and never throws.
 */
export function createEffortHook({ config, logger, storage }: EffortHookDeps) {
    return async function onContext(event: ContextEvent): Promise<void> {
        const { providerID, id } = event.model
        const optionKey = config.reasoningEffort.providers[providerID]
        if (!optionKey) {
            return
        }
        if (event.options[optionKey] !== undefined) {
            logger.debug("effort already set by an earlier hook:", `${providerID}:${optionKey}`)
            return
        }

        try {
            const stored = await loadDecision(storage, event.sessionID)
            const choice = stored?.response.answers.effort?.choice
            if (!stored || !choice) {
                return
            }
            if (stored.resolved?.provider !== providerID || stored.resolved.model !== id) {
                logger.debug("skipped effort: model is not the routed model", `${providerID}/${id}`)
                return
            }
            const value = config.reasoningEffort.values[choice] ?? choice
            event.options[optionKey] = value
            logger.debug("applied effort", choice, "as", `${providerID}:${optionKey}=${value}`)
        } catch (error) {
            logger.warn("could not apply effort:", error)
        }
    }
}
