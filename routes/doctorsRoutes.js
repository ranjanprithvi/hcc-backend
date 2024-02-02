import express from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import {
    Doctor,
    doctorSchema,
    doctorSchemaObject,
} from "../models/doctorModel.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import _ from "lodash";
import { Hospital } from "../models/hospitalModel.js";
import { Specialization } from "../models/specializationModel.js";
const router = express.Router();

router.get("/", async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    const doctors = await Doctor.find(query).populate({
        path: "appointments",
        populate: { path: "appointments", model: "appointment" },
    });
    console.log(doctors);
    res.send(doctors);
});

router.get("/:id", [auth, validateObjectId], async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).send("Resource not found");
    res.send(doctor);
});

router.post(
    "/",
    [auth, admin, validateBody(doctorSchemaObject)],
    async (req, res) => {
        const hospital = await Hospital.findById(req.body.hospitalId);
        if (!hospital) return res.status(400).send("Invalid hospitalId");

        const specialization = await Specialization.findById(
            req.body.specializationId
        );
        if (!specialization)
            return res.status(400).send("Invalid specializationId");

        let doctor = new Doctor({
            ..._.pick(req.body, ["name", "qualifications", "practicingSince"]),
            hospital: hospital._id,
            specialization: specialization._id,
        });
        await doctor.save();

        hospital.doctors.push(doctor._id);
        await hospital.save();

        res.status(201).send(doctor);
    }
);

router.patch(
    "/:id",
    [validateObjectId, auth, admin, validateEachParameter(doctorSchema)],
    async (req, res) => {
        let doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).send("Resource not found");

        const hospitalId = doctor.hospital;

        if (req.body.hospitalId) {
            const newHospital = await Hospital.findById(req.body.hospitalId);
            if (!newHospital) return res.status(400).send("Invalid hospitalId");
            req.body.hospital = newHospital._id;
            delete req.body.hospitalId;

            const oldHospital = await Hospital.findById(hospitalId);

            if (newHospital._id != oldHospital._id) {
                oldHospital.doctors.splice(
                    oldHospital.doctors.indexOf(doctor._id),
                    1
                );
                newHospital.doctors.push(doctor._id);
                await oldHospital.save();
                await newHospital.save();
            }
        }
        if (req.body.specializationId) {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specializationId");
            req.body.specialization = specialization._id;
            delete req.body.specializationId;
        }

        doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        res.send(doctor);
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).send("Resource not found");
    res.send(doctor);
});

export default router;
