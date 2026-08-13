import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { generateCompanionReply } from "../companion/reply";

// API Gateway HTTP API (payload format 2.0) event/response shape — matches
// the `HttpApi` event type used in template.yaml, via @types/aws-lambda.

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

// This function has two event sources: the real HttpApi POST /chat route,
// and (see template.yaml) a scheduled EventBridge "warmup ping" that exists
// purely to keep the function's execution environment hot. The two are
// structurally distinguishable in a way a real caller cannot spoof:
//
// - A genuine API Gateway HTTP API (v2) invocation always has
//   `requestContext.http` populated by API Gateway itself, built from the
//   actual incoming HTTP request. The client's JSON body is placed *only*
//   in `event.body` as a raw string — API Gateway never merges
//   client-supplied fields into the top level of the event object, so
//   there's no way for a request body to fake a `requestContext`.
// - The scheduled EventBridge rule invokes the function directly (no API
//   Gateway involved) with SAM's `Input` property as the entire event
//   payload — per AWS's own SAM docs, "If you use this property, nothing
//   from the event text itself is passed to the target," i.e. the Lambda
//   receives *exactly* `{"warmupPing": true}` (see template.yaml) and
//   nothing else. It structurally cannot have `requestContext.http`.
//
// So "does this event have `requestContext.http`?" alone is a reliable,
// unspoofable real-request/ping discriminator. The `warmupPing` marker is
// checked too, purely so the CloudWatch log line can say plainly which
// case this was, not because it's load-bearing for the safety property.
export function isApiGatewayHttpEvent(event: unknown): event is APIGatewayProxyEventV2 {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof (event as { requestContext?: { http?: { method?: unknown } } }).requestContext?.http
      ?.method === "string"
  );
}

export const handler = async (
  event: APIGatewayProxyEventV2 | { warmupPing: true },
): Promise<APIGatewayProxyResultV2> => {
  if (!isApiGatewayHttpEvent(event)) {
    const recognizedPing = (event as { warmupPing?: unknown })?.warmupPing === true;
    console.log(
      `[WARMUP PING] skipped real logic${recognizedPing ? "" : " (unrecognized non-API-Gateway invocation — short-circuited anyway, failing closed)"}`,
    );
    return { statusCode: 200, body: "warm" };
  }

  let payload: Record<string, unknown>;
  try {
    const raw = event.isBase64Encoded && event.body
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return jsonResponse(400, { message: "Request body must be valid JSON." });
  }

  const { elderId, message } = payload as {
    elderId?: unknown;
    message?: unknown;
  };

  if (typeof elderId !== "string" || !elderId) {
    return jsonResponse(400, { message: "`elderId` is required and must be a string." });
  }
  if (typeof message !== "string" || !message) {
    return jsonResponse(400, { message: "`message` is required and must be a string." });
  }

  try {
    const reply = await generateCompanionReply({ elderId, message });
    return jsonResponse(200, { reply });
  } catch (err) {
    console.error("chatHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while generating a reply." });
  }
};
