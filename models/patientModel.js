import Joi from "joi";
import _ from "lodash";
import mongoose, { Schema, model } from "mongoose";

export const patientSchema = {
    accountId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    name: Joi.string().min(3).max(50).required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    dob: Joi.date().max(new Date()).required(),
};
export const patientSchemaObject = Joi.object(patientSchema);

const dbSchema = new Schema({
    accountId: {
        type: mongoose.Types.ObjectId,
        ref: "account",
        required: true,
    },
    name: { type: String, minLength: 3, maxLength: 50, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, max: new Date(), required: true },
    medicalRecords: [{ type: mongoose.Types.ObjectId, ref: "medicalRecord" }],
    prescriptions: [{ type: mongoose.Types.ObjectId, ref: "medicalRecord" }],
    appointments: [{ type: mongoose.Types.ObjectId, ref: "appointment" }],
});

export const Patient = model("patient", dbSchema);
