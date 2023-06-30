import Joi from "joi";
import moment from "moment";
import mongoose, { model, Schema } from "mongoose";

export const appointmentSchema = {
    timeSlot: Joi.date().required(),
    doctorId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    profileId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    newAppointmentId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    startTime: Joi.date().min(moment()).required(),
    endTime: Joi.date().min(Joi.ref("startTime")).required(),
};

const dbSchema = new Schema({
    timeSlot: { type: Date, min: moment(), required: true },
    doctor: {
        type: mongoose.Types.ObjectId,
        ref: "doctor",
        index: true,
        required: true,
    },
    profile: {
        type: mongoose.Types.ObjectId,
        ref: "profile",
    },
    cancelled: Boolean,
});

export const Appointment = model("appointment", dbSchema);
