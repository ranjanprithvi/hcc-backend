import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";

export const prescriptionSchema = {
    // Patient related
    profile: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    // Doctor related
    doctor: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    dateOnDocument: Joi.date().max(moment().add(1, "day").toDate()),

    content: Joi.string().max(5000).min(0),
    medications: Joi.array(),

    // S3 storage related
    // s3Path: Joi.string().required(),
    // recordName: Joi.string().min(3).max(50).required(),
    // files: Joi.array().items(
    //     Joi.object({
    //         name: Joi.string().required(),
    //         sizeInBytes: Joi.number().min(1).required(),
    //     })
    // ),
};
export const prescriptionSchemaObject = Joi.object(prescriptionSchema);

// export const editPrescriptionSchema = {
//     dateOnDocument: Joi.date().max(moment().add(1, "day")),
//     content: Joi.string().max(5000),
//     medications: Joi.array().items(
//         Joi.object({
//             name: Joi.string().required(),
//             dosage: Joi.string().max(20),
//             interval: Joi.string().max(20),
//             quantity: Joi.string().max(20),
//             instructions: Joi.string().max(100),
//         })
//     ),
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
        type: mongoose.Types.ObjectId,
        ref: "doctor",
    },

    dateOnDocument: { type: Date, max: moment().add(1, "day").toDate() },
    content: {
        type: String,
        maxLength: 5000,
    },
    medications: {
        type: [
            {
                name: { type: String, required: true },
                dosage: { type: String, maxLength: 20 },
                interval: { type: String, maxLength: 20 },
                quantity: { type: String, maxLength: 20 },
                instructions: { type: String, maxLength: 100 },
            },
        ],
        default: [],
    },

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
    //     default: [],
    // },
});

export const Prescription = model("prescription", dbSchema);
