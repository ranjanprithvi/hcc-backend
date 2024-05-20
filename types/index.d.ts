import { Roles } from "../models/account-model";

export {};

declare global {
    namespace Express {
        export interface Request {
            account: {
                _id: string;
                accessLevel: number;
                hospital?: string;
            };
        }
    }
    export interface Query {
        doctorId?: string;
        date?: string;
        accessLevel?: Roles;
    }
}
