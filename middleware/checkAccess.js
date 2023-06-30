export const checkAccess = (exclusionRoles, accountList, Model, property) => {
    return async (req, res, next) => {
        if (exclusionRoles.includes(req.account.accessLevel)) {
            return next();
        }

        let id;
        const obj = await Model.findById(req.params.id);
        if (!obj) {
            return res.status(404).send("Resource not found");
        }

        if (property) {
            if (obj[property]) id = obj[property].toString();
            else return next();
        } else {
            id = req.params.id;
        }
        console.log(id);

        if (!req.account[accountList].includes(id)) {
            return res.status(403).send("Access Denied");
        }

        next();
    };
};
