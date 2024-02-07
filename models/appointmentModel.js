import Joi from "joi";
import _ from "lodash";
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

    rescheduledAppointmentId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),

    date: Joi.date().min(moment().startOf("day")).required(),
    startTime: Joi.string()
        .regex(/^([0-9]{2})\:([0-9]{2})$/)
        .required(),
    endTime: Joi.string()
        .regex(/^([0-9]{2})\:([0-9]{2})$/)
        .required(),
    durationInMinutes: Joi.number().required(),
};

export const createSlotsSchemaObject = Joi.object(
    _.pick(appointmentSchema, [
        "date",
        "startTime",
        "endTime",
        "durationInMinutes",
        "doctorId",
    ])
).custom((doc, helpers) => {
    if (doc.startTime > doc.endTime) {
        throw new Error("Start time should be earlier than End time!");
    }
    return doc; // Return the value unchanged
});

const dbSchema = new Schema({
    timeSlot: { type: Date, required: true },
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
