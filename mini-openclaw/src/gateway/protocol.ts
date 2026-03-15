import type { SessionKey } from "../core/types.js";

export type GatewayRequestMap = {
  "health.check": { params: {}; result: { ok: true } };
  "sessions.get": {
    params: { sessionKey: SessionKey };
    result: { sessionKey: SessionKey; found: boolean; sessionId?: string; updatedAt?: number };
  };
  "agent.run": {
    params: { sessionKey: SessionKey; message: string; agentId?: string };
    result: { runId: string; accepted: true };
  };
};

export type GatewayRequestName = keyof GatewayRequestMap;

export type GatewayRequest<K extends GatewayRequestName = GatewayRequestName> = {
  type: "req";
  id: string;
  method: K;
  params: GatewayRequestMap[K]["params"];
};

export type GatewayRequestUnion = {
  [K in GatewayRequestName]: GatewayRequest<K>;
}[GatewayRequestName];

export type GatewaySuccess<K extends GatewayRequestName = GatewayRequestName> = {
  type: "res";
  id: string;
  ok: true;
  payload: GatewayRequestMap[K]["result"];
};

export type GatewaySuccessUnion = {
  [K in GatewayRequestName]: GatewaySuccess<K>;
}[GatewayRequestName];

export type GatewayFailure = {
  type: "res";
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type GatewayEvent =
  | { type: "event"; event: "agent.started"; payload: { runId: string; sessionKey: SessionKey } }
  | { type: "event"; event: "agent.delta"; payload: { runId: string; text: string } }
  | { type: "event"; event: "agent.finished"; payload: { runId: string; text: string } };
