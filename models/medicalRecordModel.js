import Joi from "joi";
import _ from "lodash";
import moment from "moment";
import mongoose, { Schema, model } from "mongoose";

export const medicalRecordSchema = {
    profileId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    s3Path: Joi.string().required(),
    recordName: Joi.string().min(3).max(50).required(),
    numberOfParts: Joi.number(),
    recordType: Joi.string().required(),
    files: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                sizeInBytes: Joi.number().min(1).required(),
            })
        )
        .min(1)
        .required(),
    hospitalId: Joi.string().regex(/^[a-f\d]{24}$/i),
    hospitalName: Joi.when("hospitalId", {
        is: null,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
    }),
    // hospitalName: Joi.alternatives().conditional("hospitalId", {
    //     is: null,
    //     then: Joi.string().required(),
    //     otherwise: Joi.forbidden(),
    // }),
    doctorId: Joi.when("hospitalId", {
        is: null,
        then: Joi.forbidden(),
        otherwise: Joi.string()
            .regex(/^[a-f\d]{24}$/i)
            .required(),
    }),
    doctorName: Joi.when("doctorId", {
        is: null,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
    }),
    specializationId: Joi.when("doctorId", {
        is: null,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
    }),
    dateOnDocument: Joi.date().max(moment()),
};
export const medicalRecordSchemaObject = Joi.object(medicalRecordSchema);

const dbSchema = new Schema({
    profileId: {
        type: mongoose.Types.ObjectId,
        ref: "profile",
        required: true,
        index: true,
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
    recordType: { type: String, required: true },
    hospital: {
        type: mongoose.Types.ObjectId,
        ref: "hospital",
    },
    hospitalName: {
        type: String,
        required: function () {
            return !this.hospital;
        },
    },
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
    specialization: {
        type: mongoose.Types.ObjectId,
        ref: "specialization",
        required: function () {
            return !this.doctor;
        },
    },
    dateOnDocument: { type: Date, max: moment() },
});

export const MedicalRecord = model("medicalRecord", dbSchema);
