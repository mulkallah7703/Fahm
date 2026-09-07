import type { RequestHandler } from "express";
import helmetModule from "helmet";
import type { HelmetOptions } from "helmet";

type HelmetMiddleware = (options?: Readonly<HelmetOptions>) => RequestHandler;

/** Helmet 8 dual CJS/ESM types are not always callable under NodeNext. */
export const helmet = helmetModule as unknown as HelmetMiddleware;
