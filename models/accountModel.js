import Joi from "joi";
import passwordComplexity from "joi-password-complexity";
import _ from "lodash";
import { Schema, model, Types } from "mongoose";
import jwt from "jsonwebtoken";
import config from "config";

const complexityOptions = {
    min: 5,
    max: 1024,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4,
};

export const roles = {
    user: 1,
    doctor: 5,
    admin: 10,
};

export const accountSchema = {
    email: Joi.string().email().min(5).max(255).required(),
    password: passwordComplexity(complexityOptions).required(),
    accessLevel: Joi.number().valid(...Object.values(roles)),
    hospitalName: Joi.alternatives().conditional("accessLevel", {
        is: roles.doctor,
        then: Joi.string().min(3).required(),
        otherwise: Joi.forbidden(),
    }),
    fieldId: Joi.alternatives().conditional("accessLevel", {
        is: roles.doctor,
        then: Joi.string().regex(/^[a-f\d]{24}$/i),
        otherwise: Joi.forbidden(),
    }),
    phone: Joi.string().max(14).min(10),
    patients: Joi.array(),
    oldPassword: Joi.allow(),
};
export const accountSchemaObject = Joi.object(accountSchema);

const dbSchema = new Schema({
    email: {
        type: String,
        minLength: 5,
        maxLength: 255,
        unique: true,
        required: true,
    },
    password: { type: String, minLength: 5, maxLength: 1024, required: true },
    accessLevel: {
        type: Number,
        enum: Object.values(roles),
        default: roles.user,
    },
    hospitalName: {
        type: String,
        required: function () {
            return this.accessLevel == roles.doctor;
        },
    },
    field: { type: Types.ObjectId, ref: "field" },
    phone: { type: String, maxLength: 14, minLength: 10 },
    patients: [{ type: Types.ObjectId, ref: "patient" }],
    // doctorName: {
    //     type: String,
    //     required: function () {
    //         return this.accessLevel == roles.doctor;
    //     },
    // },
});

dbSchema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        {
            _id: this._id,
            email: this.email,
            accessLevel: this.accessLevel,
            patients: this.patients,
            hospitalName: this.hospitalName,
        },
        config.get("JWTPrivateKey")
        // ,{ expiresIn: "24h" }
    );
    return token;
};

export const Account = model("account", dbSchema);
