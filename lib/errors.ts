import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export type ErrorCode =
  | "INVALID_INPUT"
  | "INVALID_QUERY"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SAFETY_REFUSAL"
  | "INTERNAL";

export interface ApiErrorShape {
  error: {
    code: ErrorCode;
    message: string;
    userMessage: string;
    traceId: string;
  };
}

export class ApiError extends Error {
  code: ErrorCode;
  userMessage: string;
  status: number;

  constructor(code: ErrorCode, message: string, userMessage: string, status = 400) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
  }
}

export function errorResponse(err: unknown): NextResponse<ApiErrorShape> {
  const traceId = randomUUID();

  if (err instanceof ApiError) {
    return NextResponse.json<ApiErrorShape>(
      {
        error: {
          code: err.code,
          message: err.message,
          userMessage: err.userMessage,
          traceId,
        },
      },
      { status: err.status }
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error("[api-error]", traceId, message, err);
  return NextResponse.json<ApiErrorShape>(
    {
      error: {
        code: "INTERNAL",
        message,
        userMessage: "Something went wrong. Please try again.",
        traceId,
      },
    },
    { status: 500 }
  );
}
