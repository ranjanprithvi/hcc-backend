import Joi from "joi";
import { model, Schema } from "mongoose";

export const medicationSchema = {
    name: Joi.string().min(3).required(),
};

export const medicationSchemaObject = Joi.object(medicationSchema);

const dbSchema = new Schema({
    name: { type: String, unique: true, required: true },
});

export const Medication = model("medication", dbSchema);
