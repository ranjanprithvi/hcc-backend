import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";

export const profileSchema = {
    // For admin
    accountId: Joi.string().regex(/^[a-f\d]{24}$/i),

    name: Joi.string().min(3).max(50).required(),
    gender: Joi.string().valid("male", "female", "other").required(),
    dob: Joi.date().max(moment()).required(),
    phone: Joi.string().pattern(/^[+]?[0-9]{9,13}$/),
};
export const profileSchemaObject = Joi.object(profileSchema);

const dbSchema = new Schema({
    account: {
        type: mongoose.Types.ObjectId,
        ref: "account",
        // required: true,
    },
    name: { type: String, minLength: 3, maxLength: 50, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, max: moment(), required: true },
    phone: { type: String, maxLength: 14, minLength: 10 },
    appointments: [{ type: mongoose.Types.ObjectId, ref: "appointment" }],
    medicalRecords: [{ type: mongoose.Types.ObjectId, ref: "medicalRecord" }],
    prescriptions: [{ type: mongoose.Types.ObjectId, ref: "prescription" }],
    externalRecords: [{ type: mongoose.Types.ObjectId, ref: "externalRecord" }],
    externalPrescriptions: [
        { type: mongoose.Types.ObjectId, ref: "externalPrescription" },
    ],
});

export const Profile = model("profile", dbSchema);
