import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { addMemory } from "../ingest";
import type { MemorySource } from "@prisma/client";

// API Gateway HTTP API (payload format 2.0) event/response shape — matches
// the `HttpApi` event type used in template.yaml, via @types/aws-lambda.

const VALID_SOURCES: MemorySource[] = ["family_added", "conversation_derived"];

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

  const { elderId, content, source, addedByFamilyMemberId } = payload as {
    elderId?: unknown;
    content?: unknown;
    source?: unknown;
    addedByFamilyMemberId?: unknown;
  };

  if (typeof elderId !== "string" || !elderId) {
    return jsonResponse(400, { message: "`elderId` is required and must be a string." });
  }
  if (typeof content !== "string" || !content) {
    return jsonResponse(400, { message: "`content` is required and must be a string." });
  }
  if (typeof source !== "string" || !VALID_SOURCES.includes(source as MemorySource)) {
    return jsonResponse(400, {
      message: `\`source\` is required and must be one of: ${VALID_SOURCES.join(", ")}.`,
    });
  }
  if (addedByFamilyMemberId !== undefined && typeof addedByFamilyMemberId !== "string") {
    return jsonResponse(400, { message: "`addedByFamilyMemberId` must be a string if provided." });
  }

  try {
    const memory = await addMemory({
      elderId,
      content,
      source: source as MemorySource,
      addedByFamilyMemberId: addedByFamilyMemberId as string | undefined,
    });
    return jsonResponse(201, memory);
  } catch (err) {
    // Log the real error to CloudWatch, but don't leak internals (stack
    // traces, DB connection strings, etc.) into the HTTP response body.
    console.error("addMemoryHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while adding this memory." });
  }
};
