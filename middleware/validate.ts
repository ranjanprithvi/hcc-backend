import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export const validateBody = <T>(schemaObject: Joi.ObjectSchema<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schemaObject.validate(req.body);
        if (error) {
            return res.status(400).send(`Errors in fields...
          ${JSON.stringify(error.details[0].message)}`);
        }
        next();
    };
};

export const validateEachParameter = (schema: {
    [key: string]: Joi.Schema;
}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            for (let key in req.body) {
                if (Object.keys(schema).includes(key)) {
                    Joi.assert(req.body[key], schema[key]);
                } else {
                    return res.status(400).send(`${key} not allowed`);
                }
            }
        } catch (err) {
            return res.status(400).send((err as Error).message);
        }
        next();
    };
};
