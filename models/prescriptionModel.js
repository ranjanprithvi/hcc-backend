import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";
import { specializationSchema } from "./specializationModel.js";
import { medicationSchema } from "./medicationModel.js";

export const prescriptionSchema = {
    // Patient related
    profileId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    // Doctor related
    doctorId: Joi.string().regex(/^[a-f\d]{24}$/i),
    doctorName: Joi.when("doctorId", {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.string().required(),
    }),
    hospitalName: Joi.when("doctorId", {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.string().required(),
    }),

    // Document related
    specializationId: Joi.when("doctorId", {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.string()
            .regex(/^[a-f\d]{24}$/i)
            .required(),
    }),
    dateOnDocument: Joi.date().max(moment()),

    content: Joi.string().min(10).max(5000),
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

    // S3 storage related
    s3Path: Joi.string().required(),
    recordName: Joi.string().min(3).max(50).required(),
    files: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            sizeInBytes: Joi.number().min(1).required(),
        })
    ),
};
export const prescriptionSchemaObject = Joi.object(prescriptionSchema);

export const editPrescriptionSchema = {
    doctorName: Joi.string(),
    hospitalName: Joi.string(),
    specializationId: Joi.string().regex(/^[a-f\d]{24}$/i),
    dateOnDocument: Joi.date().max(moment()),
    content: Joi.string().min(10).max(5000),
};

const dbSchema = new Schema({
    // Patient related
    profile: {
        type: mongoose.Types.ObjectId,
        ref: "profile",
        required: true,
        index: true,
    },

    // Doctor related
    doctor: {
        type: mongoose.Types.ObjectId,
        ref: "doctor",
    },
    doctorName: {
        type: String,
        required: function () {
            return !this.doctor;
        },
    },
    hospitalName: {
        type: String,
        required: function () {
            return !this.doctor;
        },
    },

    // Document related
    specialization: {
        type: mongoose.Types.ObjectId,
        ref: "specialization",
        required: function () {
            return !this.doctor;
        },
    },
    dateOnDocument: { type: Date, max: moment() },
    content: {
        type: String,
        minLength: 10,
        maxLength: 5000,
    },
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
    external: Boolean,

    // S3 storage related
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
        default: [],
    },
});

export const Prescription = model("prescription", dbSchema);
