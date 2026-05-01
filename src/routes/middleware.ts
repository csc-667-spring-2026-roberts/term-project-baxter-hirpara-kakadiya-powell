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

  // save previous url (referer is the page the user was on, not the
  // endpoint they were trying to hit — avoids POST-to-GET mismatch)
  req.session.returnTo = req.get("referer") ?? "/";

  // API requests get 401 JSON (fetch can't follow redirects for navigation)
  // page requests get redirected to login
  if (req.originalUrl.startsWith("/api")) {
    res.status(401).json({ error: "not authenticated" });
  } else {
    res.redirect("/login");
  }
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
      error: err.message || "An unexpected error has occurred",
    });
    return;
  }

  // For regular page requests, render error page
  res.status(err.status || 500).render("error", {
    title: "Error",
    styles: ["error"],
    error: {
      message: err.message || "An unexpected error has occurred",
      status: err.status || 500,
    },
  });
}

export { requireAuth, errorHandler };
