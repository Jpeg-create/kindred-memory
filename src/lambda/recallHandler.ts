import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { recallSimilarMemories } from "../recall";

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

  const { elderId, queryText, limit } = payload as {
    elderId?: unknown;
    queryText?: unknown;
    limit?: unknown;
  };

  if (typeof elderId !== "string" || !elderId) {
    return jsonResponse(400, { message: "`elderId` is required and must be a string." });
  }
  if (typeof queryText !== "string" || !queryText) {
    return jsonResponse(400, { message: "`queryText` is required and must be a string." });
  }
  if (limit !== undefined && (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1)) {
    return jsonResponse(400, { message: "`limit` must be a positive integer if provided." });
  }

  try {
    const results = await recallSimilarMemories({
      elderId,
      queryText,
      limit: limit as number | undefined,
    });
    return jsonResponse(200, { results });
  } catch (err) {
    console.error("recallHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while recalling memories." });
  }
};
