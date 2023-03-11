import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Appointment } from "../../models/appointmentModel.js";
import { Patient } from "../../models/patientModel.js";
import { Account, roles } from "../../models/accountModel.js";
import moment from "moment";
import { Purpose } from "../../models/purposeModel.js";

describe("/api/appointments", () => {
    afterEach(async () => {
        await Appointment.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Patient.collection.deleteMany({});
        await Purpose.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token, query, patientId, doctorAccount;

        beforeEach(async () => {
            patientId = mongoose.Types.ObjectId();
            doctorAccount = new Account({ accessLevel: roles.doctor });
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            await Appointment.collection.insertMany([
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                    patientId: mongoose.Types.ObjectId(),
                    purpose: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                    patientId: patientId,
                    purpose: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                    cancelled: true,
                },
                {
                    createdByAccountId: mongoose.Types.ObjectId(),
                    timeSlot: moment().add(7, "days"),
                    patientId: patientId,
                    purpose: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Follow-Up",
                    },
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/appointments")
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        // it("should return 400 if client is a user and patientId is not provided in query", async () => {
        //     token = new Account({ patients: [patientId] }).generateAuthToken();
        //     const res = await exec();
        //     expect(res.status).toBe(400);
        // });

        // it("should return 403 if client is a user and patientId is not in account", async () => {
        //     token = new Account({ patients: [patientId] }).generateAuthToken();
        //     query = { patientId: mongoose.Types.ObjectId().toString() };

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        // it("should return 403 if client is not one of the role options", async () => {
        //     token = new Account({ accessLevel: 8 }).generateAuthToken();

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        // it("should return only appointments belonging to the account when client is a user", async () => {
        //     token = new Account({ patients: [patientId] }).generateAuthToken();
        //     query = { patientId: patientId.toString() };

        //     const res = await exec();
        //     expect(res.status).toBe(200);
        //     expect(res.body.length).toBe(2);
        // });

        it("should return only appointments belonging to the account when client is a doctor", async () => {
            token = doctorAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the appointments if client is not a doctor", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(4);
        });
    });

    // describe("GET /:id", () => {
    //     let token, id, appointment;

    //     beforeEach(async () => {
    //         appointment = new Appointment({
    //             timeSlot: moment().add(7, "days"),
    //             patientId: mongoose.Types.ObjectId(),
    //             purpose: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "General Checkup",
    //             },
    //         });
    //         await appointment.save();
    //         id = appointment._id;

    //         token = new Account({
    //             patients: [appointment.patientId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/appointments/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if appointment does not belong to doctor", async () => {
    //         token = new Account().generateAuthToken();
    //         const res = await exec();
    //         expect(res.status).toBe(403);
    //     });

    //     it("should allow for retrieval if account is admin", async () => {
    //         token = new Account({
    //             accessLevel: roles.admin,
    //         }).generateAuthToken();
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //     });

    //     it("should return 404 status if id is not valid", async () => {
    //         id = 1;
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return 404 status if no appointment with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the appointment if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", appointment._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "patientId",
    //             appointment.patientId.toString()
    //         );

    //         expect(res.body.purpose._id).toEqual(
    //             appointment.purpose._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(appointment.timeSlot);
    //     });
    // });

    describe("POST /createslots", () => {
        let token, params, account, patient;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
                hospitalName: "hospital1",
            });
            await account.save();

            token = account.generateAuthToken();

            const startTime = moment(new Date("12-11-2031")).format(
                "MM-DD-YYYY"
            );
            const endTime = moment("12-11-2031", "MM-DD-YYYY").add(
                40,
                "minutes"
            );
            params = {
                startTime,
                endTime,
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/appointments/createSlots")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if client is not at least a doctor", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if client is admin and createdByAccountId is not provided", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and createdByAccountId is invalid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = { name: "blah" };

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and no account with the given createdByAccountId exists", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and the account with the given createdByAccountId is not a doctor", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            account = new Account({
                email: "abcd@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await account.save();
            params.createdByAccountId = account._id;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should allow for appointment slots creation if client is admin and createdByAccountId is valid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = account._id;

            const response = await exec();
            expect(response.status).toBe(201);
        });

        it("should return 400 if startTime is not provided", async () => {
            delete params.startTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not a date", async () => {
            params.startTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not in the future", async () => {
            params.startTime = "09/14/2010";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not provided", async () => {
            delete params.endTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not a date", async () => {
            params.endTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not in the future", async () => {
            params.endTime = "09/13/2010";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is before startTime", async () => {
            params.endTime = moment("12/11/2031").add(-2, "minutes");
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should store the appointments in the db if request is valid", async () => {
            await exec();
            const appointments = await Appointment.find({
                createdByAccountId: account._id,
            });

            expect(appointments).not.toBeNull();
            expect(appointments.length).toBe(2);
        });

        it("should return the appointment if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
            expect(res.body.length).toBe(2);

            expect(res.body[0]).toHaveProperty("_id");
            expect(res.body[0]).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body[0]).toHaveProperty("timeSlot");
            expect(res.body[1]).toHaveProperty("_id");
            expect(res.body[1]).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body[1]).toHaveProperty("timeSlot");
        });
    });

    describe("PATCH /book/:id", () => {
        let token,
            params,
            account,
            appointment,
            id,
            patient,
            purpose,
            doctorAccount;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
            });

            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
            });
            purpose = new Purpose({ name: "General Checkup" });

            await purpose.save();
            await patient.save();
            await account.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                patientId: patient._id.toString(),
                purposeId: purpose._id.toString(),
            };
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/book/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if patientId is not provided", async () => {
            delete params.patientId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if patientId is invalid", async () => {
            params.patientId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if patientId is not found", async () => {
            params.patientId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is not provided", async () => {
            delete params.purposeId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is invalid", async () => {
            params.purposeId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is not found", async () => {
            params.purposeId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        // it("should return 403 if account is user and patientId does not belong to account", async () => {
        //     token = new Account({
        //         accessLevel: roles.user,
        //     }).generateAuthToken();
        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        it("should return 403 if account is doctor and appointment does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to book if account is doctor and appointment belongs to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 400 if unexpected parameter is passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is already booked", async () => {
            appointment.patientId = mongoose.Types.ObjectId();
            appointment.purpose = {
                _id: mongoose.Types.ObjectId(),
                name: "purpose1",
            };
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should add the patientId and purpose properties in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment.patientId.toString()).toEqual(params.patientId);
            expect(appointment).toHaveProperty("purpose");
        });

        it("should add appointmentId to the patient's appointments if request is valid", async () => {
            await exec();
            const p = await Patient.findById(patient._id);

            expect(p.appointments[0]).toEqual(appointment._id);
        });

        it("should return the appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body.patientId.toString()).toBe(params.patientId);
            expect(res.body).toHaveProperty("purpose");
        });
    });

    describe("PATCH /reschedule/:id", () => {
        let token,
            params,
            account,
            appointment,
            newAppointment,
            id,
            patient,
            purpose,
            doctorAccount;

        beforeEach(async () => {
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
                purpose: {
                    _id: mongoose.Types.ObjectId(),
                    name: "purpose1",
                },
            });
            newAppointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(8, "days"),
            });

            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.patientId = patient._id;
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                patients: [patient._id],
            });

            purpose = new Purpose({ name: "General Checkup" });

            await purpose.save();
            await patient.save();
            await account.save();
            await appointment.save();
            await newAppointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                newAppointmentId: newAppointment._id.toString(),
                purposeId: purpose._id.toString(),
            };
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/reschedule/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if newAppointmentId is not provided", async () => {
            delete params.newAppointmentId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if newAppointmentId is invalid", async () => {
            params.newAppointmentId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if newAppointmentId is not found", async () => {
            params.newAppointmentId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is not provided", async () => {
            delete params.purposeId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is invalid", async () => {
            params.purposeId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if purposeId is not found", async () => {
            params.purposeId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 403 if account is user and patientId does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if account is doctor and appointment does not belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            appointment.createdByAccountId = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if appointment and newAppointment dont have the same createdByAccountId", async () => {
            token = doctorAccount.generateAuthToken();
            newAppointment.createdByAccountId = mongoose.Types.ObjectId();
            await newAppointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to book if account is doctor and both appointments belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 400 if unexpected parameter is passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is not booked", async () => {
            appointment.patientId = undefined;
            appointment.purpose = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 status if newAppointment slot is already booked", async () => {
            newAppointment.patientId = mongoose.Types.ObjectId();
            newAppointment.purpose = {
                _id: mongoose.Types.ObjectId(),
                name: "purpose1",
            };
            await newAppointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should remove the patientId and purpose properties in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("patientId", undefined);
            expect(appointment).toHaveProperty("purpose", undefined);
        });

        it("should add the patientId and purpose properties in the db in the newAppointment if request is valid", async () => {
            await exec();
            const new_Appointment = await Appointment.findById(
                newAppointment._id
            );

            expect(new_Appointment.patientId).toEqual(appointment.patientId);
            expect(new_Appointment).toHaveProperty("purpose");
        });

        it("should add newAppointmentId and remove appointmentId in the appointments list of the patient if request is valid", async () => {
            await exec();
            const p = await Patient.findById(patient._id);

            expect(p.appointments.length).toBe(1);
            expect(p.appointments[0]).toEqual(newAppointment._id);
        });

        it("should return the new appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty(
                "_id",
                newAppointment._id.toString()
            );
            expect(res.body).toHaveProperty(
                "timeSlot",
                newAppointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                newAppointment.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "patientId",
                appointment.patientId.toString()
            );
            expect(res.body).toHaveProperty("purpose");
        });
    });

    describe("PATCH /cancel/:id", () => {
        let token, account, appointment, id, patient, purpose, doctorAccount;

        beforeEach(async () => {
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
                purpose: {
                    _id: mongoose.Types.ObjectId(),
                    name: "purpose1",
                },
            });
            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.patientId = patient._id;

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                patients: [patient._id],
            });

            purpose = new Purpose({ name: "General Checkup" });

            await purpose.save();
            await patient.save();
            await account.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/cancel/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is user and patientId does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if account is doctor and appointment does not belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            appointment.createdByAccountId = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to cancel if account is doctor and appointment belongs to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is not booked", async () => {
            appointment.patientId = undefined;
            appointment.purpose = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should set canceled to true in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("cancelled", true);
        });

        it("should add another appointment with the same createdByAccountId and timeSlot in the db if request is valid", async () => {
            await exec();
            const appointments = await Appointment.find({
                createdByAccountId: appointment.createdByAccountId,
                timeSlot: appointment.timeSlot,
            });

            expect(appointments.length).toBe(2);
        });

        it("should return the cancelled appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "patientId",
                appointment.patientId.toString()
            );
            expect(res.body).toHaveProperty("purpose");
            expect(res.body).toHaveProperty("cancelled", true);
        });
    });

    describe("DELETE /:id", () => {
        let token, account, appointment, id, patient;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });

            appointment = new Appointment({
                createdByAccountId: mongoose.Types.ObjectId(),
                timeSlot: moment().add(7, "days"),
                purpose: {
                    _id: mongoose.Types.ObjectId(),
                    name: "purpose1",
                },
            });

            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.patientId = patient._id;

            await account.save();
            await appointment.save();
            await patient.save();

            token = account.generateAuthToken();
            id = appointment._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/appointments/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is not admin", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove the appointment from the patient if request is valid", async () => {
            await exec();

            const p = await Patient.findById(appointment.patientId);
            expect(p.appointments).toEqual([]);
        });

        it("should remove the appointment from the db if request is valid", async () => {
            await exec();

            const a = await Appointment.findById(appointment._id);
            expect(a).toBeNull();
        });

        it("should return the cancelled appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "patientId",
                appointment.patientId.toString()
            );
            expect(res.body).toHaveProperty("purpose");
        });
    });
});
