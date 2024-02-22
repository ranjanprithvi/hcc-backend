import _ from "lodash";

export const checkAccess = (
    exclusionRoles,
    accountProperty,
    Model,
    modelProperty,
    modelPropertyToPopulate
) => {
    return async (req, res, next) => {
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
