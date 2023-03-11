export const checkOwner = (exclusionRoles, Model, property) => {
    return async (req, res, next) => {
        if (exclusionRoles.includes(req.account.accessLevel)) {
            return next();
        }

        const obj = await Model.findById(req.params.id);
        if (!obj) {
            return res.status(404).send("Resource not found");
        }

        if (req.account._id != obj[property]) {
            return res.status(403).send("Access Denied");
        }
        next();
    };
};
