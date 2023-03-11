import Joi from "joi";
import { model, Schema } from "mongoose";

export const purposeSchema = {
    name: Joi.string().min(3).required(),
};

export const purposeSchemaObject = Joi.object(purposeSchema);

const dbSchema = new Schema({
    name: { type: String, minLength: 3, unique: true, required: true },
});

export const Purpose = model("purpose", dbSchema);
