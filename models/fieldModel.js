import Joi from "joi";
import { model, Schema } from "mongoose";

export const fieldSchema = {
    name: Joi.string().min(3).required(),
};

export const fieldSchemaObject = Joi.object(fieldSchema);

const dbSchema = new Schema({
    name: { type: String, unique: true, required: true },
});

export const Field = model("field", dbSchema);
