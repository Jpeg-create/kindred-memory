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

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
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
