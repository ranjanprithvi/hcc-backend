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
    hospital: 5,
    admin: 10,
};

export const accountSchema = {
    email: Joi.string().email().min(5).max(255).required(),
    password: passwordComplexity(complexityOptions).required(),
    accessLevel: Joi.number().valid(...Object.values(roles)),
    hospitalId: Joi.alternatives().conditional("accessLevel", {
        is: roles.hospital,
        then: Joi.string().regex(/^[a-f\d]{24}$/i),
        otherwise: Joi.forbidden(),
    }),
    oldPassword: Joi.string(),
};

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
    hospital: {
        type: Types.ObjectId,
        ref: "hospital",
        required: function () {
            return this.accessLevel == roles.hospital;
        },
    },
    profiles: [
        {
            type: Types.ObjectId,
            ref: "profile",
            required: function () {
                return this.accessLevel == roles.user;
            },
        },
    ],
});

dbSchema.methods.generateAuthToken = function (expiresIn) {
    let info = {
        _id: this._id,
        email: this.email,
        accessLevel: this.accessLevel,
    };
    if (this.accessLevel == roles.hospital) info.hospital = this.hospital;
    else if (this.accessLevel == roles.user) info.profiles = this.profiles;

    const options = {};
    if (expiresIn) options.expiresIn = expiresIn;

    const token = jwt.sign(info, config.get("JWTPrivateKey"), options);

    return token;
};

export const Account = model("account", dbSchema);
