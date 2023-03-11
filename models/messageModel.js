import Joi from "joi";
import mongoose, { model, Schema } from "mongoose";

export const messageSchema = {
    patientId: Joi.string()
        .regex(/^[a-f\d]{24}$/i)
        .required(),
    subject: Joi.string().max(30).required(),
    content: Joi.string().max(1024).required(),
    time: Joi.date().required(),
    read: Joi.bool(),
};

export const messageSchemaObject = Joi.object(messageSchema);

const dbSchema = new Schema({
    patientId: { type: mongoose.Types.ObjectId, ref: "patient" },
    subject: { type: String, maxLength: 30, required: true },
    content: { type: String, maxLength: 1024, required: true },
    time: { type: Date, min: new Date(), required: true },
    opened: Boolean,
});

export const Message = new model("message", dbSchema);
