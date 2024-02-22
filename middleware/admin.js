import config from "config";
import { roles } from "../models/account-model.js";

export function admin(req, res, next) {
    // 401 Unauthorised - When the jwt is invalid
    // 403 Forbidden - When the user doesnt have the permissions to make the request

    if (req.account.accessLevel < roles.admin)
        return res.status(403).send("Access Denied");

    next();
}
