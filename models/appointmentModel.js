import Joi from "joi";
import moment from "moment";
import mongoose, { model, Schema } from "mongoose";
import { hospitalSchema } from "./hospitalModel.js";

export const appointmentSchema = {
    timeSlot: Joi.date().required(),
    doctorId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    // profileId: Joi.string().regex(/^[a-f\d]{24}$/i),
    // hospitalId: Joi.alternatives().conditional("profileId", {
    //     is: Joi.string(),
    //     then: Joi.string()
    //         .regex(/^[a-f\d]{24}$/i)
    //         .required(),
    //     otherwise: Joi.forbidden(),
    // }),
    // newTimeSlot: Joi.date(),
};

export const appointmentSchemaObject = Joi.object(appointmentSchema);

const createSlotsSchema = {
    startTime: Joi.date().min(moment()).required(),
    endTime: Joi.date().min(Joi.ref("startTime")).required(),
    doctorId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
};

export const createSlotsSchemaObject = Joi.object(createSlotsSchema);

const bookAppointmentSchema = {
    profileId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
};

export const bookAppointmentSchemaObject = Joi.object(bookAppointmentSchema);

const rescheduleAppointmentSchema = {
    newAppointmentId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    hospitalId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
};

export const rescheduleAppointmentSchemaObject = Joi.object(
    rescheduleAppointmentSchema
);

const dbSchema = new Schema({
    timeSlot: { type: Date, min: moment(), required: true },
    hospital: {
        type: mongoose.Types.ObjectId,
        ref: "hospital",
        index: true,
    },
    doctor: {
        type: mongoose.Types.ObjectId,
        ref: "doctor",
    },
    profile: {
        type: mongoose.Types.ObjectId,
        ref: "profile",
    },
    cancelled: Boolean,
});

export const Appointment = model("appointment", dbSchema);
