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

export enum Roles {
    User = 1,
    Hospital = 5,
    Admin = 10,
}

// export const roles = {
//     user: 1,
//     hospital: 5,
//     admin: 10,
// };

export const accountSchema = {
    email: Joi.string().email().min(5).max(255).required(),
    // password: passwordComplexity(complexityOptions).required(),
    sub: Joi.string().required(),
    identityId: Joi.string(),
    accessLevel: Joi.number().valid(...Object.values(Roles)),
    hospitalId: Joi.alternatives().conditional("accessLevel", {
        is: Roles.Hospital,
        then: Joi.string().regex(/^[a-f\d]{24}$/i),
        otherwise: Joi.forbidden(),
    }),
    oldPassword: Joi.string(),
};

interface IAccount {
    email: string;
    password: string;
    sub: string;
    identityId: string;
    accessLevel: number;
    hospital: Types.ObjectId;
    profiles: Types.ObjectId[];
    generateAuthToken: (expiresIn?: string) => string;
}

const dbSchema = new Schema<IAccount>({
    email: {
        type: String,
        minLength: 5,
        maxLength: 255,
        unique: true,
        required: true,
    },
    password: { type: String, minLength: 5, maxLength: 1024, required: true },
    sub: { type: String, required: true },
    identityId: { type: String },
    accessLevel: {
        type: Number,
        enum: Object.values(Roles),
        default: Roles.User,
    },
    hospital: {
        type: Schema.Types.ObjectId,
        ref: "hospital",
        required: function (this: IAccount) {
            return this.accessLevel == Roles.Hospital;
        },
    },
    profiles: [
        {
            type: Types.ObjectId,
            ref: "profile",
            required: function (this: IAccount) {
                return this.accessLevel == Roles.User;
            },
        },
    ],
});

type Payload = {
    _id: string;
    email: string;
    accessLevel: number;
    hospital?: string;
    profiles?: string[];
};

dbSchema.methods.generateAuthToken = function (expiresIn = "1h") {
    let info: Payload = {
        _id: this._id,
        email: this.email,
        accessLevel: this.accessLevel,
    };
    if (this.accessLevel == Roles.Hospital) {
        info.hospital = this.hospital;
    } else if (this.accessLevel == Roles.User) info.profiles = this.profiles;

    const options: any = {};
    if (expiresIn) options.expiresIn = expiresIn;

    const token = jwt.sign(info, config.get("JWTPrivateKey"), options);

    return token;
};

export const Account = model("account", dbSchema);
