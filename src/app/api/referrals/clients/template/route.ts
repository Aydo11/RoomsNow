import { csvResponse } from "@/lib/csv";

/** A blank upload template with one clearly fictional example row. */
export function GET() {
  return csvResponse(
    "roomsnow-client-upload-template.csv",
    ["First name", "Last name", "Date of birth", "Phone", "Email", "Preferred area", "Support types", "Accommodation needs", "Support needs", "Status", "Private notes"],
    [
      [
        "Sam",
        "Example",
        "14/03/1996",
        "07700 900123",
        "sam.example@example.com",
        "Birmingham",
        "Mental health; Homelessness",
        "Ground-floor room, near a bus route",
        "Weekly key-worker sessions",
        "Active",
        "Delete this example row before uploading",
      ],
    ],
  );
}
