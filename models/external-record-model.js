import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";

export const externalRecordSchema = {
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
    dateOnDocument: Joi.date().max(moment().add(1, "day")),
    recordType: Joi.string().max(50),

    // S3 storage related
    // s3Path: Joi.string().required(),
    recordName: Joi.string().max(50).required(),
    // files: Joi.array()
    //     .items(
    //         Joi.object({
    //             name: Joi.string().required(),
    //             sizeInBytes: Joi.number().min(1).required(),
    //         })
    //     )
    //     .min(1)
    //     .required(),
};
export const externalRecordSchemaObject = Joi.object(externalRecordSchema);

// export const editExternalRecordSchema = {
//     doctor: Joi.string(),
//     hospital: Joi.string(),
//     specializationId: Joi.string().regex(/^[a-f\d]{24}$/i),
//     dateOnDocument: Joi.date().max(moment()),
//     recordType: Joi.string().max(10),
// };

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
        type: String,
        required: true,
    },
    hospital: {
        type: String,
        required: true,
    },

    // Document related
    specialization: {
        type: mongoose.Types.ObjectId,
        ref: "specialization",
        required: true,
    },
    recordName: { type: String, maxLength: 50, required: true },
    recordType: { type: String, maxLength: 50 },
    dateOnDocument: { type: Date, max: moment().add(1, "day") },

    // S3 storage related
    // folderPath: {
    //     type: String,
    //     required: true,
    //     unique: [true, "Record Name should be unique"],
    // }, // s3 path + record name
    // files: {
    //     type: [
    //         {
    //             name: { type: String, required: true },
    //             sizeInBytes: { type: Number, min: 1, required: true },
    //         },
    //     ],
    //     validate: [
    //         function (val) {
    //             return val.length > 0;
    //         },
    //         "Please provide at least one file",
    //     ],
    // },
});

export const ExternalRecord = model("externalRecord", dbSchema);
