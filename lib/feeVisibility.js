import Settings from "@/models/Settings";

/**
 * Whether fees are shown to students/parents for a given institute.
 *
 * Controls the entire student-facing fee surface AND all outgoing fee reminders.
 * Defaults to `false` (hidden) — matching the Settings schema default — so a
 * missing Settings document is treated as "fees hidden". Fee data is never
 * deleted; flipping the toggle restores everything.
 *
 * @param {import("mongoose").Types.ObjectId|string} institute_id
 * @returns {Promise<boolean>}
 */
export async function feesVisibleToStudents(institute_id) {
  if (!institute_id) return false;
  const settings = await Settings.findOne({ institute_id })
    .select("show_fees_to_students")
    .lean();
  // No settings doc yet → schema default (false).
  return settings?.show_fees_to_students === true;
}
