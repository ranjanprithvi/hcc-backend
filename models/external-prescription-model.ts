import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";

export const externalPrescriptionSchema = {
    // Patient related
    profile: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    // Doctor related
    doctor: Joi.string().required(),
    hospital: Joi.string().required(),

    // Document related
    specialization: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    dateOnDocument: Joi.date().max(moment().add(1, "day").toDate()),

    // S3 storage related
    // s3Path: Joi.string().required(),
    // recordName: Joi.string().max(50).required(),
    // files: Joi.array().items(
    //     Joi.object({
    //         name: Joi.string().required(),
    //         sizeInBytes: Joi.number().min(1).required(),
    //     })
    // ),
};

export const externalPrescriptionSchemaObject = Joi.object(
    externalPrescriptionSchema
);

// export const editExternalPrescriptionSchema = {
//     doctor: Joi.string(),
//     hospital: Joi.string(),
//     specializationId: Joi.string().regex(/^[a-f\d]{24}$/i),
//     dateOnDocument: Joi.date().max(moment()),

const dbSchema = new Schema({
    profile: {
        type: Schema.Types.ObjectId,
        ref: "profile",
        required: true,
        index: true,
    },

    doctor: {
        type: String,
        required: true,
    },
    hospital: {
        type: String,
        required: true,
    },

    specialization: {
        type: mongoose.Types.ObjectId,
        ref: "specialization",
        required: true,
    },
    dateOnDocument: { type: Date, max: moment().add(1, "day").toDate() },
}); // };

export const ExternalPrescription = model("externalPrescription", dbSchema);
