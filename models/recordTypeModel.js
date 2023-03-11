import Joi from "joi";
import { model, Schema } from "mongoose";

export const recordTypeSchema = {
    name: Joi.string().min(3).required(),
};

export const recordTypeSchemaObject = Joi.object(recordTypeSchema);

const dbSchema = new Schema({
    name: { type: String, minLength: 3, unique: true, required: true },
});

export const RecordType = model("recordType", dbSchema);
