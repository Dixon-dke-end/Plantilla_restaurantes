import type { OrderStatus } from "./types";

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Cambio de estado no válido: de «${LABELS[from]}» a «${LABELS[to]}».`);
    this.name = "InvalidTransitionError";
  }
}

const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

const BACKWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  preparing: "pending",
  ready: "preparing",
};

const OPEN: ReadonlySet<OrderStatus> = new Set(["pending", "preparing", "ready"]);

export const nextStatus = (status: OrderStatus): OrderStatus | null => FORWARD[status] ?? null;
export const previousStatus = (status: OrderStatus): OrderStatus | null => BACKWARD[status] ?? null;
export const canCancel = (status: OrderStatus): boolean => OPEN.has(status);
/** Open tickets that belong on the kitchen board. */
export const isActive = (status: OrderStatus): boolean => OPEN.has(status);

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "cancelled") return canCancel(from);
  return FORWARD[from] === to || BACKWARD[from] === to;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

const LABELS: Record<OrderStatus, string> = {
  pending: "Recibido",
  preparing: "En preparación",
  ready: "Listo",
  served: "Servido",
  cancelled: "Cancelado",
};

export const statusLabel = (status: OrderStatus): string => LABELS[status];

/** Verb shown on the kitchen "bump" target for each open status. */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Iniciar preparación",
  preparing: "Marcar como listo",
  ready: "Marcar como servido",
};
export const advanceActionLabel = (status: OrderStatus): string | null => ACTION_LABELS[status] ?? null;
