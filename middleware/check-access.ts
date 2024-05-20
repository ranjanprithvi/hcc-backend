import { Roles } from "./../models/account-model";
import _ from "lodash";
import { Request, Response, NextFunction } from "express";

export const checkAccess = (
    exclusionRoles: Roles[],
    accountProperty: keyof Request["account"],
    Model: any,
    modelProperty: string,
    modelPropertyToPopulate?: string
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (exclusionRoles.includes(req.account.accessLevel)) {
            return next();
        }

        const obj = await Model.findById(req.params.id).populate(
            modelPropertyToPopulate
        );
        if (!obj) {
            return res.status(404).send("Resource not found");
        }

        if (req.account[accountProperty] != _.get(obj, modelProperty)) {
            return res.status(403).send("Access Denied");
        }
        next();
    };
};
