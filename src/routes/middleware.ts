import { Request, Response, NextFunction } from "express";
import logger from "../util/logger.js";

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId) {
    // let through
    next();
    return;
  }

  // invalid auth handling:
  logger.warn(
    `unauthorized access attempt to ${req.originalUrl} from user id: ${req.session.userId ?? "null"}`,
  );

  // save previous url
  req.session.returnTo = req.originalUrl;
  // redirect to login (after login, will restore saved url user intended)
  res.redirect("/login");
}

/**
 * Central error handling middleware
 * Two states:
 *  1. minor, page can still be rendered => flash message popup
 *  2. HttpError, page cannot be rendered => error handler
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
