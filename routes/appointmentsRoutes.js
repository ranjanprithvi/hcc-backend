import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkOwner } from "../middleware/checkOwner.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Patient } from "../models/patientModel.js";
import { Account, roles } from "../models/accountModel.js";
import {
    Appointment,
    appointmentSchema,
    appointmentSchemaObject,
    bookAppointmentSchemaObject,
    createSlotsSchemaObject,
    rescheduleAppointmentSchemaObject,
} from "../models/appointmentModel.js";
import moment from "moment";
import { doctor } from "../middleware/doctor.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { Purpose } from "../models/purposeModel.js";
const router = express.Router();

router.get("/", auth, async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel == roles.doctor)
        query.createdByAccountId = req.account._id;

    const appointments = await Appointment.find(query);
    res.send(appointments);
});

// router.get(
//     "/:id",
//     [validateObjectId, auth, checkOwner(Appointment, "createdByAccountId")],
//     async (req, res) => {
//         const appointment = await Appointment.findById(req.params.id);
//         res.send(appointment);
//     }
// );

router.post(
    "/createSlots",
    [auth, doctor, validateBody(createSlotsSchemaObject)],
    async (req, res) => {
        let createdByAccountId = req.account._id;
        if (req.account.accessLevel != roles.doctor) {
            if (!req.body.createdByAccountId) {
                return res
                    .status(400)
                    .send("Please provide a doctor account Id");
            }

            const doctor = await Account.findById(req.body.createdByAccountId);
            if (!doctor) return res.status(400).send("Invalid account Id");
            if (doctor.accessLevel != roles.doctor)
                return res.status(400).send("Invalid doctor Id");

            createdByAccountId = doctor._id;
        }

        const start = moment(req.body.startTime);
        const end = moment(req.body.endTime);
        const appointments = [];

        for (
            let time = start;
            time < end;
            time = moment(time).add(20, "minutes")
        ) {
            appointments.push(
                await new Appointment({
                    createdByAccountId,
                    timeSlot: time,
                }).save()
            );
        }

        res.status(201).send(appointments);
    }
);

router.patch(
    "/book/:id",
    [
        validateObjectId,
        auth,
        validateBody(bookAppointmentSchemaObject),
        checkOwner(
            [roles.admin, roles.user],
            Appointment,
            "createdByAccountId"
        ),
    ],
    async (req, res) => {
        const patient = await Patient.findById(req.body.patientId);
        if (!patient) return res.status(400).send("Invalid patientId");
        const purpose = await Purpose.findById(req.body.purposeId);
        if (!purpose) return res.status(400).send("Invalid purposeId");

        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (appointment.patientId)
            return res
                .status(400)
                .send("Appointment slot has already been booked");

        appointment.patientId = patient._id;
        appointment.purpose = purpose;
        await appointment.save();

        patient.appointments.push(appointment._id);
        await patient.save();

        res.send(appointment);
    }
);

router.patch(
    "/reschedule/:id",
    [
        validateObjectId,
        auth,
        validateBody(rescheduleAppointmentSchemaObject),
        checkOwner(
            [roles.admin, roles.user],
            Appointment,
            "createdByAccountId"
        ),
        checkAccess(
            [roles.admin, roles.doctor],
            "patients",
            Appointment,
            "patientId"
        ),
    ],
    async (req, res) => {
        const purpose = await Purpose.findById(req.body.purposeId);
        if (!purpose) return res.status(400).send("Invalid purposeId");

        let newAppointment = await Appointment.findById(
            req.body.newAppointmentId
        );
        if (!newAppointment) res.status(400).send("Invalid New Appointment Id");

        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (
            appointment.createdByAccountId.toString() !=
            newAppointment.createdByAccountId.toString()
        ) {
            return res
                .status(403)
                .send("Cannot reschedule appointment to a different doctor");
        }

        if (!appointment.patientId)
            return res.status(400).send("Appointment has not been booked yet");

        if (newAppointment.patientId)
            return res
                .status(400)
                .send("New appointment slot has already been booked");

        const patient = await Patient.findById(appointment.patientId);
        patient.appointments.splice(
            patient.appointments.indexOf(appointment._id),
            1
        );
        patient.appointments.push(newAppointment._id);
        await patient.save();

        newAppointment.patientId = appointment.patientId;
        newAppointment.purpose = purpose;
        await newAppointment.save();

        appointment.patientId = undefined;
        appointment.purpose = undefined;
        await appointment.save();

        res.send(newAppointment);
    }
);

router.patch(
    "/cancel/:id",
    [
        validateObjectId,
        auth,
        checkOwner(
            [roles.admin, roles.user],
            Appointment,
            "createdByAccountId"
        ),
        checkAccess(
            [roles.admin, roles.doctor],
            "patients",
            Appointment,
            "patientId"
        ),
    ],
    async (req, res) => {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (!appointment.patientId)
            return res
                .status(400)
                .send("Appointment slot has not yet been booked");

        if (appointment.cancelled == true)
            return res
                .status(400)
                .send("Appointment has already been cancelled");

        appointment.cancelled = true;
        await appointment.save();

        await new Appointment({
            timeSlot: appointment.timeSlot,
            createdByAccountId: appointment.createdByAccountId,
        }).save();

        const patient = await Patient.findById(appointment.patientId);
        patient.appointments.splice(
            patient.appointments.indexOf(appointment._id),
            1
        );
        await patient.save();

        res.send(appointment);
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).send("Resource not found");

    const patient = await Patient.findById(appointment.patientId);
    patient.appointments.splice(
        patient.appointments.indexOf(appointment._id),
        1
    );
    await patient.save();

    res.send(appointment);
});

export default router;
