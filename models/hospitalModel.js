import Joi from "joi";
import { model, Schema, Types } from "mongoose";

export const hospitalSchema = {
    name: Joi.string().min(3).max(50).required(),
};

export const hospitalSchemaObject = Joi.object(hospitalSchema);

const dbSchema = new Schema({
    name: { type: String, minLength: 3, unique: true, required: true },
    doctors: [{ type: Types.ObjectId, ref: "doctor" }],
});

export const Hospital = model("hospital", dbSchema);
