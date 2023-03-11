import Joi from "joi";
import mongoose, { model, Schema } from "mongoose";
import { purposeSchema } from "./purposeModel.js";

export const appointmentSchema = {
    timeSlot: Joi.date().required(),
    createdByAccountId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    // patientId: Joi.string().regex(/^[a-f\d]{24}$/i),
    // purposeId: Joi.alternatives().conditional("patientId", {
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
    startTime: Joi.date().min(new Date()).required(),
    endTime: Joi.date().min(Joi.ref("startTime")).required(),
    createdByAccountId: Joi.string().regex(/^[a-f\d]{24}$/i),
};

export const createSlotsSchemaObject = Joi.object(createSlotsSchema);

const bookAppointmentSchema = {
    patientId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    purposeId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
};

export const bookAppointmentSchemaObject = Joi.object(bookAppointmentSchema);

const rescheduleAppointmentSchema = {
    newAppointmentId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    purposeId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
};

export const rescheduleAppointmentSchemaObject = Joi.object(
    rescheduleAppointmentSchema
);

const dbSchema = new Schema({
    timeSlot: { type: Date, min: new Date(), required: true },
    createdByAccountId: {
        type: mongoose.Types.ObjectId,
        ref: "account",
        index: true,
    },
    patientId: {
        type: mongoose.Types.ObjectId,
        ref: "patient",
    },
    purpose: {
        type: purposeSchema,
        required: function () {
            return this.patientId;
        },
    },
    cancelled: Boolean,
});

export const Appointment = model("appointment", dbSchema);
