import { Roles } from "../models/account-model";
import { NextFunction, Request, Response } from "express";

export function hospital(req: Request, res: Response, next: NextFunction) {
    // 401 Unauthorised - When the jwt is invalid
    // 403 Forbidden - When the user doesnt have the permissions to make the request

    if (req.account.accessLevel < Roles.Hospital)
        return res.status(403).send("Access Denied");

    next();
}
