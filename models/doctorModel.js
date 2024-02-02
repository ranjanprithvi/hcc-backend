import Joi from "joi";
import moment from "moment";
import { model, Schema, Types } from "mongoose";

export const doctorSchema = {
    name: Joi.string().min(3).max(50).required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    specializationId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    qualifications: Joi.string().required(),
    practicingSince: Joi.number().min(1950).max(moment().year()).required(),
};

export const doctorSchemaObject = Joi.object(doctorSchema);

const appointmentGroupSchema = {
    date: {
        type: Date,
        // min: moment().startOf("day"),
        required: true,
        unique: true,
    },
    appointments: [{ type: Types.ObjectId, ref: "appointment" }],
};

const dbSchema = new Schema({
    name: { type: String, minLength: 3, required: true },
    hospital: {
        type: Types.ObjectId,
        ref: "hospital",
        required: true,
        index: true,
    },
    specialization: {
        type: Types.ObjectId,
        ref: "specialization",
        required: true,
    },
    qualifications: { type: String, required: true },
    practicingSince: {
        type: Number,
        required: true,
        min: 1950,
        max: moment().year(),
    },
    appointments: [{ type: appointmentGroupSchema }],
});

export const Doctor = model("doctor", dbSchema);
