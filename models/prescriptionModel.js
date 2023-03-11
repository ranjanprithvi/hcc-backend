import Joi from "joi";
import _ from "lodash";
import mongoose, { Schema, model } from "mongoose";
import { fieldSchema } from "./fieldModel.js";
import { medicationSchema } from "./medicationModel.js";

export const prescriptionSchema = {
    patientId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    recordName: Joi.string().min(3).max(50).required(),
    content: Joi.string().min(10).max(5000),
    s3Path: Joi.string().required(),
    files: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            sizeInBytes: Joi.number().min(1).required(),
        })
    ),
    hospitalName: Joi.string().required(),
    fieldId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    dateOnDocument: Joi.date().max(new Date()),
    medications: Joi.array().items(
        Joi.object({
            medicationId: Joi.string()
                .regex(/^[a-f\d]{24}$/i)
                .required(),
            dosage: Joi.string().max(20),
            interval: Joi.string().max(20),
            durationInDays: Joi.number().max(300),
            instructions: Joi.string().max(100),
        })
    ),
};
export const prescriptionSchemaObject = Joi.object(prescriptionSchema);

const dbSchema = new Schema({
    patientId: {
        type: mongoose.Types.ObjectId,
        ref: "patient",
        required: true,
        index: true,
    },
    createdByAccountId: {
        type: mongoose.Types.ObjectId,
        ref: "account",
        required: true,
    },
    // recordName: {
    //     type: String,
    //     default: "prescription " + moment().format("DD-MM-YYYY"),
    //     minLength: 3,
    //     maxLength: 50,
    //     required: true,
    // },
    content: {
        type: String,
        minLength: 10,
        maxLength: 5000,
    },
    folderPath: {
        type: String,
        required: true,
        unique: [true, "Record Name should be unique"],
    }, // s3 path + record name
    files: {
        type: [{ name: String, sizeInBytes: { type: Number, min: 1 } }],
        default: [],
    },
    hospitalName: { type: String, required: true },
    field: { type: fieldSchema, required: true },
    dateOnDocument: { type: Date, max: new Date() },
    dateUploaded: { type: Date, required: true },
    medications: {
        type: [
            {
                medication: { type: medicationSchema, required: true },
                dosage: { type: String, maxLength: 20 },
                interval: { type: String, maxLength: 20 },
                durationInDays: { type: Number, max: 300 },
                instructions: { type: String, maxLength: 100 },
            },
        ],
        default: [],
    },
});

export const Prescription = model("prescription", dbSchema);
