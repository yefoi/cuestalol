import { NextResponse } from "next/server";

import { hasApiKey, listRemoteModels, providerInfo } from "@/lib/deepseek";
import { modelCatalog, modelsForProvider } from "@/lib/models";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verify = url.searchParams.get("verify") === "1";

  const provider = providerInfo();
  const models = modelsForProvider(provider?.id);
  const base = modelCatalog();

  const defaults = base.defaults.filter((id) =>
    models.some((model) => model.id === id),
  );
  const estimatorModel = models.some((model) => model.id === base.estimatorModel)
    ? base.estimatorModel
    : models[0]?.id ?? base.estimatorModel;

  const catalog = {
    ...base,
    models,
    defaults: defaults.length ? defaults : models.slice(0, 1).map((m) => m.id),
    estimatorModel,
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
