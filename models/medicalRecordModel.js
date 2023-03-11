import Joi from "joi";
import _ from "lodash";
import mongoose, { Schema, model } from "mongoose";
import { fieldSchema } from "./fieldModel.js";
import { recordTypeSchema } from "./recordTypeModel.js";

export const medicalRecordSchema = {
    patientId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    recordName: Joi.string().min(3).max(50).required(),
    numberOfParts: Joi.number(),
    recordTypeId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    s3Path: Joi.string().required(),
    files: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                sizeInBytes: Joi.number().min(1).required(),
            })
        )
        .min(1)
        .required(),
    hospitalName: Joi.string().required(),
    fieldId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    dateOnDocument: Joi.date().max(new Date()),
};
export const medicalRecordSchemaObject = Joi.object(medicalRecordSchema);

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
    //     minLength: 3,
    //     maxLength: 50,
    //     required: true,
    // },
    folderPath: {
        type: String,
        required: true,
        unique: [true, "Record Name should be unique"],
    }, // s3 path + record name
    files: {
        type: [
            {
                name: { type: String, required: true },
                sizeInBytes: { type: Number, min: 1, required: true },
            },
        ],
        validate: [
            function (val) {
                return val.length > 0;
            },
            "Please provide at least one file",
        ],
    },
    recordType: { type: recordTypeSchema, required: true },
    hospitalName: { type: String, required: true },
    field: { type: fieldSchema, required: true },
    dateOnDocument: { type: Date, max: new Date() },
    dateUploaded: { type: Date, required: true },
});

export const MedicalRecord = model("medicalRecord", dbSchema);
