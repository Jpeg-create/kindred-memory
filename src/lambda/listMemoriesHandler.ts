import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { prisma } from "../lib/prisma";

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
  const elderId = event.queryStringParameters?.elderId;

  if (typeof elderId !== "string" || !elderId) {
    return jsonResponse(400, { message: "`elderId` is required and must be a string." });
  }

  try {
    const memories = await prisma.memory.findMany({
      where: { elderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        source: true,
        createdAt: true,
        addedByFamilyMember: { select: { id: true, name: true } },
      },
    });
    return jsonResponse(200, { memories });
  } catch (err) {
    console.error("listMemoriesHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while listing memories." });
  }
};
