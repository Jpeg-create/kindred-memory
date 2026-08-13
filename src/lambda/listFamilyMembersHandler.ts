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
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const familyMembers = await prisma.familyMember.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        relationship: true,
      },
    });
    return jsonResponse(200, { familyMembers });
  } catch (err) {
    console.error("listFamilyMembersHandler failed:", err);
    return jsonResponse(500, { message: "Something went wrong while listing family members." });
  }
};
