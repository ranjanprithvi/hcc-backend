import { Roles } from "../models/account-model";
import config from "config";
import { NextFunction, Request, Response } from "express";

export function admin(req: Request, res: Response, next: NextFunction) {
    if (!config.get("authEnabled")) return next();

    // 401 Unauthorised - When the jwt is invalid
    // 403 Forbidden - When the user doesnt have the permissions to make the request

    if (req.account.accessLevel < Roles.Admin)
        return res.status(403).send("Access Denied");
    // if (!req.accepted) return res.status(403).send("Access Denied");

    next();
}
