import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";
import { specializationSchema } from "./specializationModel.js";
import { medicationSchema } from "./medicationModel.js";

export const prescriptionSchema = {
    profileId: Joi.string()
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
    doctorId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    specializationId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    dateOnDocument: Joi.date().max(moment()),
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
    profileId: {
        type: mongoose.Types.ObjectId,
        ref: "profile",
        required: true,
        index: true,
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
    doctor: {
        type: mongoose.Types.ObjectId,
        ref: "doctor",
        required: true,
    },
    specialization: { type: specializationSchema, required: true },
    hospital: {
        type: mongoose.Types.ObjectId,
        ref: "hospital",
        required: true,
    },
    dateOnDocument: { type: Date, max: moment() },
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
