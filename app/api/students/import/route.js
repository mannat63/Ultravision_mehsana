import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Student from "@/models/Student";
import User from "@/models/User";
import Section from "@/models/Section";
import Class from "@/models/Class";
import Fee from "@/models/Fee";

export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);

    const body = await req.json();
    const { students } = body; // Array of objects
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No student data provided" }, { status: 400 });
    }

    // Prefetch all classes and sections to map by name
    const existingClasses = await Class.find({ institute_id: authUser.institute_id });
    const existingSections = await Section.find({ institute_id: authUser.institute_id });
    
    const classMap = {}; // name -> class_id
    existingClasses.forEach(c => classMap[c.name.toLowerCase()] = c._id);
    
    // Store sections per class: classId -> { sectionName -> sectionId }
    const sectionMap = {}; 
    existingSections.forEach(s => {
      const cid = s.class_id.toString();
      if (!sectionMap[cid]) sectionMap[cid] = {};
      sectionMap[cid][s.name.toLowerCase()] = s._id;
    });

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < students.length; i++) {
      const rowNum = i + 1;
      const data = students[i];
      
      const name = data.name;
      const parent_phone = data.parent_phone;
      const class_name = data.class_name;
      const section_name = data.section_name;
      const admission_date_raw = data.admission_date;
      const total_fee = data.total_fee;

      if (!name || !parent_phone || !class_name || !section_name) {
        errors.push(`Row ${rowNum}: Missing required fields (Name, Phone, Class, or Section)`);
        failed++;
        continue;
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent_phone);
      const isPhone = /^\+?[0-9]{10,15}$/.test(parent_phone.replace(/[\s-]/g, ''));
      if (!isEmail && !isPhone) {
        errors.push(`Row ${rowNum}: Invalid phone/email format "${parent_phone}"`);
        failed++;
        continue;
      }

      // 1. Get or Create Class
      let cId = classMap[class_name.toLowerCase()];
      if (!cId) {
        const newClass = await Class.create({
           name: class_name,
           institute_id: authUser.institute_id
        });
        cId = newClass._id;
        classMap[class_name.toLowerCase()] = cId;
        sectionMap[cId.toString()] = {};
      }

      // 2. Get or Create Section
      let bId = sectionMap[cId.toString()][section_name.toLowerCase()];
      if (!bId) {
        const newSection = await Section.create({
           name: section_name,
           class_id: cId,
           institute_id: authUser.institute_id
        });
        bId = newSection._id;
        sectionMap[cId.toString()][section_name.toLowerCase()] = bId;
      }

      // Check duplicate student by phone
      const existingUser = await User.findOne({ phoneOrEmail: parent_phone });
      const existingStudent = await Student.findOne({ parent_phone, institute_id: authUser.institute_id });
      
      if (existingUser || existingStudent) {
        errors.push(`Row ${rowNum}: Student with phone ${parent_phone} already exists`);
        failed++;
        continue;
      }

      // Parse date safely
      let admission_date = new Date();
      if (admission_date_raw) {
        const parsed = new Date(admission_date_raw);
        if (!isNaN(parsed.getTime())) {
          admission_date = parsed;
        }
      }

      try {
        const user = await User.create({
          name,
          phoneOrEmail: parent_phone,
          role: "STUDENT",
          institute_id: authUser.institute_id
        });

        // CSV imports default to a MONTHLY plan; total_fee is treated as the monthly rate.
        const parsedFee = total_fee !== undefined && total_fee !== null ? parseFloat(total_fee) : NaN;
        const monthlyRate = !isNaN(parsedFee) && parsedFee >= 0 ? parsedFee : 0;

        const student = await Student.create({
          user_id: user._id,
          section_id: bId,
          parent_name: "Parent of " + name, // Since format only gives phone, we infer parent name or use student name
          parent_phone,
          admission_date,
          fee_frequency: "MONTHLY",
          monthly_fee: monthlyRate,
          institute_id: authUser.institute_id
        });

        if (monthlyRate > 0) {
          const start = new Date(admission_date);
          start.setUTCHours(0, 0, 0, 0);
          await Fee.create({
            student_id: student._id,
            total_amount: monthlyRate,
            paid_amount: 0,
            due_amount: monthlyRate,
            due_date: start,
            status: "DUE",
            frequency: "MONTHLY",
            period_start: start,
            period_end: new Date(new Date(start).setUTCMonth(start.getUTCMonth() + 1) - 24 * 60 * 60 * 1000),
            institute_id: authUser.institute_id
          });
        }

        imported++;
      } catch (dbErr) {
        errors.push(`Row ${rowNum}: Database error - ${dbErr.message}`);
        failed++;
      }
    }

    return NextResponse.json({
      message: `Import complete. Success: ${imported}, Failed: ${failed}`,
      imported,
      failed,
      errors
    }, { status: 200 });

  } catch (error) {
    console.error("CSV Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
