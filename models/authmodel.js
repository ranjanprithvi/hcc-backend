import Joi from "joi";

const authSchema = {
    email: Joi.string().email().max(255).required(),
    password: Joi.string().max(1024).required(),
};
export const authSchemaObject = Joi.object(authSchema);
