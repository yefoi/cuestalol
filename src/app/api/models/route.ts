import { NextResponse } from "next/server";

import { hasApiKey, listRemoteModels, providerInfo } from "@/lib/deepseek";
import { modelCatalog } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verify = url.searchParams.get("verify") === "1";

  const base = modelCatalog();
  const provider = providerInfo();

  const catalog = {
    ...base,
    baseUrl: provider?.baseUrl ?? base.baseUrl,
    hasApiKey: hasApiKey(),
    provider,
  };

  if (!verify || !catalog.hasApiKey) {
    return NextResponse.json(catalog);
  }

  try {
    const remote = await listRemoteModels();
    return NextResponse.json({
      ...catalog,
      verified: true,
      remoteModels: remote,
    });
  } catch (error) {
    return NextResponse.json({
      ...catalog,
      verified: false,
      verifyError:
        error instanceof Error ? error.message : "Error de verificación.",
    });
  }
}
