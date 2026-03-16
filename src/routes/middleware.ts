import { Request, Response, NextFunction } from "express";
import logger from "../util/logger.js";

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    logger.warn(
      `unauthorized access attempt to ${req.originalUrl} from user id: ${req.session.userId ?? "null"}`,
    );
    res.redirect("/"); return;
  }
  next();
}

/**
 * Central error handling middleware
 */
function errorHandler(
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the error
  logger.error(err.message, {
    stack: err.stack,
    url: req.originalUrl,
  });

  // Handle API requests with JSON response
  if (req.originalUrl.startsWith("/api")) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || "An unexpected error occurred",
    });
    return;
  }

  // For regular page requests, render error page
  res.status(err.status || 500).render("error", {
    title: "Error",
    styles: ["error"],
    error: {
      message: err.message || "An unexpected error occurred",
      status: err.status || 500,
    },
  });
}

export { requireAuth, errorHandler };
