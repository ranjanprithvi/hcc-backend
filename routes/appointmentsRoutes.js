import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkOwner } from "../middleware/checkOwner.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Profile } from "../models/profileModel.js";
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
import { doctor } from "../middleware/hospital.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { Hospital } from "../models/hospitalModel.js";
const router = express.Router();

router.get("/", [auth, doctor], async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    switch (req.account.accessLevel) {
        case roles.hospital:
            query.createdByAccountId = req.account._id;
            break;
        case roles.user:
            if (!Object.keys(query).includes("profileId"))
                return res.status(400).send("Please provide profileId");
            query.profile = query.profileId;
            delete query.profileId;
            break;
        case roles.admin:
            break;
        default:
            return res.status(403).send("Invalid User Type");
    }

    let date = query.date ? date : undefined;
    delete query.date;

    const appointments = await Appointment.find(query);
    res.send(
        date
            ? appointments.filter((a) => moment(a.timeSlot).isSame(date, "day"))
            : appointments
    );
});

router.get("/openslots", auth, async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);
    query.profile = undefined;

    if (req.account.accessLevel == roles.hospital)
        query.createdByAccountId = req.account._id;

    let date = query.date ? date : undefined;
    delete query.date;

    const appointments = await Appointment.find(query);
    res.send(
        date
            ? appointments.filter((a) => moment(a.timeSlot).isSame(date, "day"))
            : appointments
    );
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
        if (req.account.accessLevel != roles.hospital) {
            if (!req.body.createdByAccountId) {
                return res
                    .status(400)
                    .send("Please provide a doctor account Id");
            }

            const doctor = await Account.findById(req.body.createdByAccountId);
            if (!doctor) return res.status(400).send("Invalid account Id");
            if (doctor.accessLevel != roles.hospital)
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
        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid profileId");
        const hospital = await Hospital.findById(req.body.hospitalId);
        if (!hospital) return res.status(400).send("Invalid hospitalId");

        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (appointment.profile)
            return res
                .status(400)
                .send("Appointment slot has already been booked");

        appointment.profile = profile._id;
        appointment.hospital = hospital;
        await appointment.save();

        profile.appointments.push(appointment._id);
        await profile.save();

        res.send(appointment);
    }
);

router.patch(
    "/reschedule/:id",
    [
        validateObjectId,
        auth,
        validateBody(rescheduleAppointmentSchemaObject),
        checkOwner([roles.admin, roles.user], Appointment, "hospital"),
        checkAccess(
            [roles.admin, roles.hospital],
            "profiles",
            Appointment,
            "profile"
        ),
    ],
    async (req, res) => {
        const hospital = await Hospital.findById(req.body.hospitalId);
        if (!hospital) return res.status(400).send("Invalid hospitalId");

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

        if (!appointment.profile)
            return res.status(400).send("Appointment has not been booked yet");

        if (newAppointment.profile)
            return res
                .status(400)
                .send("New appointment slot has already been booked");

        const profile = await Profile.findById(appointment.profile);
        profile.appointments.splice(
            profile.appointments.indexOf(appointment._id),
            1
        );
        profile.appointments.push(newAppointment._id);
        await profile.save();

        newAppointment.profile = { ...appointment.profile };
        newAppointment.hospital = hospital;
        await newAppointment.save();

        appointment.profile = undefined;
        appointment.hospital = undefined;
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
            [roles.admin, roles.hospital],
            "profiles",
            Appointment,
            "profile"
        ),
    ],
    async (req, res) => {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (!appointment.profile)
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

        const profile = await Profile.findById(appointment.profile._id);
        profile.appointments.splice(
            profile.appointments.indexOf(appointment._id),
            1
        );
        await profile.save();

        res.send(appointment);
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).send("Resource not found");

    const profile = await Profile.findById(appointment.profile._id);
    profile.appointments.splice(
        profile.appointments.indexOf(appointment._id),
        1
    );
    await profile.save();

    res.send(appointment);
});

export default router;
