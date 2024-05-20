import { logger } from "../startup/logger";
import { NextFunction, Request, Response } from "express";

export function error(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    logger.error(err.message, err);

    res.status(500).send("Something went wrong..");
}
