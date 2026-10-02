import type { Plugin } from "@opencode/plugin"
import { getApiAuthFromProvider } from "./auth.ts"
import { normalizeConfig } from "./config.ts"
import { createEffortHook } from "./effort.ts"
import { initLogger } from "./logger.ts"
import { createPromptRouter } from "./router.ts"

const PLUGIN_ID = "opencode-jev-router-plugin"

const plugin: Plugin.Plugin = {
    id: PLUGIN_ID,

    async setup(ctx) {
        const config = normalizeConfig(ctx.options)
        const logger = initLogger(PLUGIN_ID, config)

        if (!config.enabled) {
            logger.info("plugin disabled")
            return
        }

        const onPrompt = createPromptRouter({
            config,
            logger,
            storage: ctx.storage,
            session: ctx.session,
            getRouterBaseUrl: async () => {
                const provider = await ctx.provider.get({
                    providerID: config.router.provider,
                })
                return provider?.data?.settings?.baseURL
            },
            getRouterApiKey: () => getApiAuthFromProvider(config.router.provider),
            listSkills: async () => (await ctx.skill.list()).data ?? [],
            repository: ctx.location.project?.canonical,
            modelAvailable: async (providerID, modelID) => {
                const models = await ctx.model.list()
                return models.data.some(
                    (model) => model.providerID === providerID && model.modelID === modelID,
                )
            },
            fetchImpl: fetch,
        })

        const onContext = createEffortHook({ config, logger, storage: ctx.storage })

        const promptHook = await ctx.session.hook("prompt", onPrompt)
        const contextHook = await ctx.session.hook("context", onContext)

        logger.debug("hooks registered")

        return async () => {
            await promptHook.dispose()
            await contextHook.dispose()
        }
    },
}

export default plugin
