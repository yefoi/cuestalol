"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  IconAlert,
  IconCrown,
  IconLock,
  IconRocket,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import {
  Badge,
  Card,
  Field,
  SectionHeading,
  Stat,
  cn,
  inputClass,
} from "@/components/ui";
import { formatNumber, formatUsd } from "@/lib/format";
import type { Catalog } from "@/lib/types";

interface Props {
  catalog: Catalog | null;
}

const FIXED_MONTHLY = 10;

interface Plan {
  name: string;
  price: string;
  suffix?: string;
  tagline: string;
  icon: (props: { className?: string }) => ReactNode;
  tone: "sky" | "green" | "violet" | "amber";
  featured: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "€0",
    tagline: "Para probar la herramienta",
    icon: IconRocket,
    tone: "sky" as const,
    featured: false,
    features: [
      "3 acciones al día",
      "Solo modelos económicos (MiMo, GLM Flash, DeepSeek Flash)",
      "Con publicidad",
    ],
  },
  {
    name: "Pro",
    price: "€7",
    suffix: "/mes",
    tagline: "Para freelancers y makers",
    icon: IconCrown,
    tone: "green" as const,
    featured: true,
    features: [
      "300 acciones al mes",
      "Incluye DeepSeek V4 Pro, GLM y Kimi (con tope)",
      "Sin publicidad",
      "Exportación PDF y CSV",
    ],
  },
  {
    name: "BYOK",
    price: "€5",
    suffix: "/mes",
    tagline: "Trae tu propia clave",
    icon: IconLock,
    tone: "violet" as const,
    featured: false,
    features: [
      "Acciones ilimitadas con tu clave OpenCode/DeepSeek",
      "Riesgo de tokens cero para nosotros",
      "Ideal para usuarios técnicos",
    ],
  },
  {
    name: "Equipo",
    price: "€19",
    suffix: "/mes",
    tagline: "Para agencias y equipos",
    icon: IconUsers,
    tone: "amber" as const,
    featured: false,
    features: [
      "5 usuarios",
      "1.500 acciones al mes",
      "Historial y exportación compartidos",
    ],
  },
];

const planIconTones = {
  sky: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
};

export default function PlansPanel({ catalog }: Props) {
  const models = useMemo(() => catalog?.models ?? [], [catalog]);
  const [modelId, setModelId] = useState("");
  const [payingUsers, setPayingUsers] = useState(50);
  const [actionsPerUser, setActionsPerUser] = useState(100);
  const [inputTokens, setInputTokens] = useState(800);
  const [outputTokens, setOutputTokens] = useState(700);
  const [targetMargin, setTargetMargin] = useState(80);

  const effectiveModel =
    modelId || catalog?.estimatorModel || models[0]?.id || "";

  const sim = useMemo(() => {
    const model = models.find((m) => m.id === effectiveModel);
    if (!model) return null;

    const costFor = (tier: "offPeak" | "peak") => {
      const price = model.pricing[tier];
      const perAction =
        (inputTokens / 1_000_000) * price.cacheMissInput +
        (outputTokens / 1_000_000) * price.output;
      return perAction;
    };

    const offAction = costFor("offPeak");
    const peakAction = costFor("peak");
    const offUserRaw = offAction * actionsPerUser;
    const offUser = offUserRaw * payingUsers;
    const peakUser = peakAction * actionsPerUser * payingUsers;
    const totalOff = offUser + FIXED_MONTHLY;
    const totalPeak = peakUser + FIXED_MONTHLY;

    const breakEven = payingUsers > 0 ? totalOff / payingUsers : 0;
    const marginFactor = Math.max(1 - targetMargin / 100, 0.01);
    const recommended = breakEven / marginFactor;
    const revenue = recommended * payingUsers;
    const marginPct =
      revenue > 0 ? ((revenue - totalOff) / revenue) * 100 : 0;

    const limit = model.monthlyLimitUsd ?? 0;
    const exceedsLimit = limit > 0 && offUser > limit;

    return {
      model,
      offAction,
      peakAction,
      offUser,
      peakUser,
      totalOff,
      totalPeak,
      breakEven,
      recommended,
      revenue,
      marginPct,
      limit,
      exceedsLimit,
    };
  }, [
    models,
    effectiveModel,
    payingUsers,
    actionsPerUser,
    inputTokens,
    outputTokens,
    targetMargin,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="animate-rise">
        <SectionHeading
          title="Cómo monetizar sin perder dinero"
          subtitle="El coste por consulta es una fracción de céntimo; el riesgo está en el abuso y en los topes por modelo."
          icon={<IconWallet className="size-4" />}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Coste fijo"
            value="$10/mes"
            hint="Suscripción OpenCode Go"
            tone="amber"
            icon={<IconWallet className="size-3.5" />}
          />
          <Stat
            label="Coste por acción"
            value="~$0.0003–0.013"
            hint="Según modelo, valle y sin caché"
            tone="green"
            icon={<IconRocket className="size-3.5" />}
          />
          <Stat
            label="Margen típico"
            value="60–95%"
            hint="Con planes de pago y cuotas"
            tone="sky"
            icon={<IconCrown className="size-3.5" />}
          />
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <IconAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            OpenCode Go es una suscripción personal para agentes de código y no
            permite reventa abusiva. Para un servicio público multiusuario usa{" "}
            <strong>OpenCode Zen (pago por uso)</strong> o el modelo{" "}
            <strong>BYOK</strong>: cada usuario trae su clave.
          </span>
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.name}
              interactive
              className={cn(
                "flex flex-col gap-3 animate-rise",
                plan.featured && "ring-1 ring-emerald-400/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border",
                    planIconTones[plan.tone],
                  )}
                >
                  <Icon className="size-5" />
                </span>
                {plan.featured ? <Badge tone="green">Recomendado</Badge> : null}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500">{plan.tagline}</p>
              </div>
              <div className="text-2xl font-bold tracking-tight text-slate-50">
                {plan.price}
                {plan.suffix ? (
                  <span className="text-sm font-normal text-slate-500">
                    {plan.suffix}
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-1.5 text-sm text-slate-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="animate-rise">
        <SectionHeading
          title="Simulador de margen"
          subtitle="Calcula tu coste real, el precio de equilibrio y el margen según tu modelo y cuota."
          icon={<IconRocket className="size-4" />}
        />

        {!models.length ? (
          <p className="text-sm text-slate-400">Cargando modelos…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
            <div className="flex flex-col gap-4">
              <Field label="Modelo principal">
                <select
                  value={effectiveModel}
                  onChange={(e) => setModelId(e.target.value)}
                  className={inputClass}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900">
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Usuarios de pago">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={payingUsers}
                    onChange={(e) => setPayingUsers(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Acciones/usuario/mes">
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    value={actionsPerUser}
                    onChange={(e) => setActionsPerUser(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tokens entrada">
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    value={inputTokens}
                    onChange={(e) => setInputTokens(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Tokens salida">
                  <input
                    type="number"
                    min={0}
                    max={200000}
                    value={outputTokens}
                    onChange={(e) => setOutputTokens(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={`Margen objetivo · ${targetMargin}%`}>
                <input
                  type="range"
                  min={0}
                  max={95}
                  step={5}
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="accent-emerald-400"
                />
              </Field>
            </div>

            {sim ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Coste / acción (valle)"
                    value={formatUsd(sim.offAction)}
                    tone="green"
                  />
                  <Stat
                    label="Coste / acción (punta)"
                    value={formatUsd(sim.peakAction)}
                    tone="amber"
                  />
                  <Stat
                    label="Coste tokens / mes"
                    value={formatUsd(sim.offUser)}
                    hint={`+ ${formatUsd(FIXED_MONTHLY)} fijo`}
                    tone="rose"
                  />
                  <Stat
                    label="Coste total / mes"
                    value={formatUsd(sim.totalOff)}
                    hint={`Punta: ${formatUsd(sim.totalPeak)}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat
                    label="Precio de equilibrio"
                    value={`${formatUsd(sim.breakEven)}/usuario`}
                    tone="sky"
                  />
                  <Stat
                    label={`Precio recomendado (${targetMargin}%)`}
                    value={`${formatUsd(sim.recommended)}/usuario`}
                    tone="green"
                  />
                  <Stat
                    label="Margen resultante"
                    value={`${sim.marginPct.toFixed(0)}%`}
                    hint={`Ingresos ${formatUsd(sim.revenue)}/mes`}
                    tone="violet"
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400">
                  <p>
                    {formatNumber(payingUsers)} usuarios ×{" "}
                    {formatNumber(actionsPerUser)} acciones ={" "}
                    {formatNumber(payingUsers * actionsPerUser)} acciones/mes con{" "}
                    <strong className="text-slate-200">{sim.model.label}</strong>.
                  </p>
                  <p className="mt-1">
                    A {formatUsd(sim.recommended)}/usuario ingresarías{" "}
                    {formatUsd(sim.revenue)}/mes y gastarías{" "}
                    {formatUsd(sim.totalOff)}/mes.
                  </p>
                </div>

                {sim.exceedsLimit ? (
                  <p className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
                    <IconAlert className="mt-0.5 size-3.5 shrink-0" />
                    El coste de tokens ({formatUsd(sim.offUser)}) supera el
                    límite mensual de {sim.model.label} en Go (
                    {formatUsd(sim.limit)}). Reparte la carga entre varios
                    modelos o pasa a OpenCode Zen / BYOK.
                  </p>
                ) : sim.limit > 0 ? (
                  <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    Dentro del límite mensual de {sim.model.label} en Go (
                    {formatUsd(sim.limit)} disponible).
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="animate-rise">
        <SectionHeading
          title="Guardarraíles para no perder dinero"
          icon={<IconLock className="size-4" />}
        />
        <ul className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            Login e identidad por usuario antes de gastar tokens.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            Cuota diaria/mensual y rate-limit en servidor (Redis o BD).
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            Topes por modelo: reserva V4 Pro, Kimi K3 y Qwen Max para planes de
            pago.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            max_tokens limitado y thinking desactivado por defecto.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            Prefiere hora valle (mitad de precio) y activa caché de prompt.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            No actives &quot;Use balance&quot; en Go, o pon un tope de gasto en
            Zen.
          </li>
        </ul>
      </Card>
    </div>
  );
}
