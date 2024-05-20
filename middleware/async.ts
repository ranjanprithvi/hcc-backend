import { Request, Response, NextFunction } from "express";

//This is a factory function. A closure
export function asyncMiddleware(handler: Function) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res);
        } catch (ex) {
            next(ex);
        }
    };
}
