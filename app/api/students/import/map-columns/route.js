import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { headers, sampleRow } = await req.json();

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json({ error: "Headers are required" }, { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `
You are an intelligent data mapping assistant for a Student Management System.
We are importing a CSV/Excel file. The file has the following columns (headers):
${JSON.stringify(headers)}

A sample row of data is:
${JSON.stringify(sampleRow)}

Our database requires the following fields:
- name (Required: The student's full name)
- parent_phone (Required: Phone number or email of the parent/student)
- class_name (Required: The standard or class name, e.g., 'Class 10', '12th Science')
- section_name (Required: The section or batch name, e.g., 'A', 'Morning Batch')
- admission_date (Optional: Date of admission)
- total_fee (Optional: The total course fee amount)

Please map the provided file headers to our database fields. Find the best match for each database field from the provided headers. If a required field cannot be reasonably matched, map it to null. If an optional field cannot be matched, map it to null.

Return ONLY a valid JSON object with a single "mappings" key. The "mappings" object should have the database fields as keys and the matching file header as values (or null).

Example Output:
{
  "mappings": {
    "name": "Student Name",
    "parent_phone": "Mobile",
    "class_name": "Standard",
    "section_name": "Division",
    "admission_date": "DOJ",
    "total_fee": null
  }
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    let result = { mappings: {} };
    if (content) {
      try {
        result = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse JSON from LLM", e);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Map columns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
