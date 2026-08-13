import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { prisma } from "../lib/prisma";

// API Gateway HTTP API (payload format 2.0) event/response shape — matches
// the `HttpApi` event type used in template.yaml, via @types/aws-lambda.

const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  const { elderId, start, end } = event.queryStringParameters ?? {};

  if (typeof elderId !== "string" || !elderId) {
    return jsonResponse(400, { message: "`elderId` is required and must be a string." });
  }
  if (typeof start !== "string" || !start) {
    return jsonResponse(400, { message: "`start` is required and must be a string." });
  }
  if (typeof end !== "string" || !end) {
    return jsonResponse(400, { message: "`end` is required and must be a string." });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime())) {
    return jsonResponse(400, { message: "`start` must be a valid date." });
  }
  if (Number.isNaN(endDate.getTime())) {
    return jsonResponse(400, { message: "`end` must be a valid date." });
  }
  if (endDate.getTime() - startDate.getTime() > MAX_RANGE_MS) {
    return jsonResponse(400, { message: "The range between `start` and `end` must not exceed 30 days." });
  }

  try {
    const turns = await prisma.conversationTurn.findMany({
      where: { elderId, createdAt: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true, createdAt: true },
    });
    return jsonResponse(200, { turns });
  } catch (err) {
    console.error("conversationTranscriptHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while fetching this transcript." });
  }
};
