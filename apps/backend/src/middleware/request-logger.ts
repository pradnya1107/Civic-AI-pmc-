import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = Date.now();
  const requestId = randomUUID();

  response.setHeader("X-Request-Id", requestId);
  response.on("finish", () => {
    console.info(
      JSON.stringify({
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });

  next();
};
