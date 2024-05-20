import Joi from "joi";
import { model, Schema } from "mongoose";

export const specializationSchema = {
    name: Joi.string().min(3).required(),
};

export const specializationSchemaObject = Joi.object(specializationSchema);

const dbSchema = new Schema({
    name: { type: String, unique: true, required: true },
});

export const Specialization = model("specialization", dbSchema);
