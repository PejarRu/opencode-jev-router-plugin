# JEV classifier protocol

What the plugin sends to and accepts from the router. Types live in
`src/jev.ts`; the question texts and criteria are in `buildJevRequest`.

## Request

`POST {baseURL}/systemone`, where `baseURL` is the router provider's
`settings.baseURL` in OpenCode with trailing slashes removed.

Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`.
The request is aborted after `timeoutMs`.

```ts
interface JevRoutingRequest {
    model: string // router.model, e.g. "typesafe/jev-1.13"
    state: {
        request: {
            userMessage: string // prompt with @file/@skill mentions removed
            taskType?: string
            files: Array<{ path: string; estimatedTokenSize?: number }>
        }
        skills: Array<{ name: string; description?: string; estimatedTokenSize?: number }>
        conversation?: {
            previous?: {
                userTextPreview?: string
                userTextTokens?: number
                files?: string[]
                fileCount?: number
                assistant?: {
                    model?: string // "providerID/modelID"
                    agent?: string
                    finish?: string
                    cost?: number
                    toolCount?: number
                    textPreview?: string
                    tokens?: {
                        input: number
                        output: number
                        reasoning: number
                        cacheRead: number
                        cacheWrite: number
                    }
                }
            }
            contextTokens?: number
            turnCount?: number
        }
        executionContext?: {
            agent?: string
            repository?: string
            language?: string
            framework?: string
            toolCount?: number
        }
    }
    questions: Record<
        "model_tier" | "reasoning_complexity" | "task_scope" | "ambiguity" | "task_type" | "effort",
        { type: "choice"; instructions: string; criteria: Record<string, string> }
    >
}
```

`criteria` maps each allowed choice to its description; the keys are the only
valid answers for that question.

The plugin populates `executionContext.repository` (the project directory) only;
the other `executionContext` fields are part of the wire type but are left
unset.

Token estimates are `ceil(characters / 4)` for text and
`min(ceil(bytes / 4), 200000)` for files. They are routing signals, not
tokenizer counts.

## Response

```ts
interface JevRoutingResponse {
    model: string
    answers: Partial<
        Record<
            string,
            {
                type: "choice"
                choice: string
                probabilities?: Record<string, number>
                confidence: number // 0..1
            }
        >
    >
    usage: { input_tokens: number; output_tokens: number; cost: number }
    id?: string
    provider?: string
}
```

## Validation

- Non-2xx status: `JevRequestError` with the status and body; `onError`
  applies.
- Body not an object, `model` not a string, or `usage` not an object:
  `JevRequestError`; `onError` applies.
- A body that is not valid JSON makes `response.json()` throw a native
  `SyntaxError` (not a `JevRequestError`); `onError` still applies.
- `answers` missing: treated as `{}`.
- `usage` fields that are not finite numbers: treated as `0`.
- Unknown answer keys and unknown choices are kept in the stored decision and
  ignored by model resolution (an unknown `model_tier` resolves to
  `fallback`).
