import { NextResponse } from "next/server"
import { accountIdSuffix } from "@/lib/ai/diagnostics"
import { listPublicProviderStatus } from "@/lib/ai/router"
import {
  listConfiguredCloudflareSlots,
  listConfiguredProviderIds,
  loadSecrets,
  resolveCloudflareApiToken,
} from "@/lib/ai/secrets"
import { resolveUiSlotModelId, UI_MODEL_SLOTS, type UiModelSlotId } from "@/src/config/accountApiConfig"

/** Public status (no secrets). Used for admin/health UI. */
export async function GET() {
  const secrets = loadSecrets()
  const slots = Object.keys(UI_MODEL_SLOTS) as UiModelSlotId[]

  return NextResponse.json({
    configured: listConfiguredProviderIds(),
    cloudflare: {
      accountIdPresent: Boolean(secrets.cloudflare.accountId),
      accountIdSuffix: accountIdSuffix(secrets.cloudflare.accountId) ?? null,
      fallbackTokenPresent: Boolean(secrets.cloudflare.apiToken),
      configuredSlots: listConfiguredCloudflareSlots(),
      slots: Object.fromEntries(
        slots.map((slot) => [
          slot,
          {
            name: UI_MODEL_SLOTS[slot].name,
            modelId: resolveUiSlotModelId(slot),
            tokenPresent: Boolean(resolveCloudflareApiToken(slot, secrets)),
            tokenEnvKey: UI_MODEL_SLOTS[slot].tokenEnvKey,
            modelEnvKey: UI_MODEL_SLOTS[slot].envOverrideKey,
          },
        ]),
      ),
    },
    providers: listPublicProviderStatus(),
  })
}
