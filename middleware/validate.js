import Joi from "joi";

export const validateBody = (schemaObject) => {
    return (req, res, next) => {
        const { error } = schemaObject.validate(req.body);
        if (error) {
            return res.status(400).send(`Errors in fields...
          ${JSON.stringify(error.details[0].message)}`);
        }
        next();
    };
};

export const validateEachParameter = (schema) => {
    return (req, res, next) => {
        try {
            for (let key in req.body) {
                if (Object.keys(schema).includes(key)) {
                    Joi.assert(req.body[key], schema[key]);
                } else return res.status(400).send(`${key} not allowed`);
            }
        } catch (err) {
            return res.status(400).send(err.message);
        }
        next();
    };
};
