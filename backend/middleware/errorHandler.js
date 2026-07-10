export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log the full error server-side for debugging
  // eslint-disable-next-line no-console
  console.error(error);

  res.status(statusCode).json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  });
};