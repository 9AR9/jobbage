"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import connectDB from "../db";
import { Board, Column, JobApplication } from "../models";
import { JOB_ORDER_STEP } from "../constants";

interface JobApplicationData {
  company: string;
  position: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  columnId: string;
  boardId: string;
  tags?: string[];
  description?: string;
}

export async function createJobApplication(data: JobApplicationData) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  await connectDB();

  const {
    company,
    position,
    location,
    notes,
    salary,
    jobUrl,
    columnId,
    boardId,
    tags,
    description,
  } = data;

  if (!company || !position || !columnId || !boardId) {
    return { error: "Missing required fields" };
  }

  // Verify board ownership
  const board = await Board.findOne({
    _id: boardId,
    userId: session.user.id,
  });

  if (!board) {
    return { error: "Board not found" };
  }

  // Verify column belongs to board
  const column = await Column.findOne({
    _id: columnId,
    boardId: boardId,
  });

  if (!column) {
    return { error: "Column not found" };
  }

  const maxOrder = (await JobApplication.findOne({ columnId })
    .sort({ order: -1 })
    .select("order")
    .lean()) as { order: number } | null;

  const jobApplication = await JobApplication.create({
    company,
    position,
    location,
    notes,
    salary,
    jobUrl,
    columnId,
    boardId,
    userId: session.user.id,
    tags: tags || [],
    description,
    status: "applied",
    order: maxOrder ? maxOrder.order + JOB_ORDER_STEP : 0,
  });

  await Column.findByIdAndUpdate(columnId, {
    $push: { jobApplications: jobApplication._id },
  });

  revalidatePath("/dashboard");

  return { data: JSON.parse(JSON.stringify(jobApplication)) };
}

export async function updateJobApplication(
  id: string,
  updates: {
    company?: string;
    position?: string;
    location?: string;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    columnId?: string;
    order?: number;
    tags?: string[];
    description?: string;
  },
) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Server actions can run in a fresh process, and db.ts sets
  // bufferCommands: false, so queries fail unless we're connected first.
  await connectDB();

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const { columnId, order, ...otherUpdates } = updates;

  const updatesToApply: Partial<{
    company: string;
    position: string;
    location: string;
    notes: string;
    salary: string;
    jobUrl: string;
    columnId: string;
    order: number;
    tags: string[];
    description: string;
  }> = otherUpdates;

  const currentColumnId = jobApplication.columnId.toString();
  const newColumnId = columnId?.toString();

  const isMovingToDifferentColumn =
    newColumnId && newColumnId !== currentColumnId;

  if (isMovingToDifferentColumn) {
    await Column.findByIdAndUpdate(currentColumnId, {
      $pull: { jobApplications: id },
    });
    await Column.findByIdAndUpdate(newColumnId, {
      $push: { jobApplications: id },
    });
    updatesToApply.columnId = newColumnId;
  }

  if (isMovingToDifferentColumn || (order !== undefined && order !== null)) {
    const targetColumnId = newColumnId || currentColumnId;

    const otherJobs = await JobApplication.find({
      columnId: targetColumnId,
      _id: { $ne: id },
    })
      .sort({ order: 1, _id: 1 })
      .select("_id")
      .lean();

    // order is a position index. Clamp it to 0..length rather than relying on
    // how splice treats bad values: a negative index counts from the end (the
    // card would land second-to-last) and NaN becomes 0 (silently the top).
    // The column can also change between the drag and this call (e.g. another
    // tab deleted a card), so an out-of-range value means "at the bottom".
    const index = Math.min(
      Math.max(order ?? otherJobs.length, 0),
      otherJobs.length,
    );
    const orderedIds = otherJobs.map((job) => job._id.toString());
    orderedIds.splice(index, 0, id);

    // Rewrite the whole column as 0, JOB_ORDER_STEP, 2 * JOB_ORDER_STEP... so gaps
    // and ties from earlier moves can't push a job to the wrong place.
    await JobApplication.bulkWrite(
      orderedIds.map((jobId, position) => ({
        updateOne: {
          filter: { _id: jobId },
          update: { $set: { order: position * JOB_ORDER_STEP } },
        },
      })),
    );

    delete updatesToApply.order;
    delete updatesToApply.columnId;
    if (isMovingToDifferentColumn) {
      await JobApplication.findByIdAndUpdate(id, { columnId: newColumnId });
    }
  }

  const updated = await JobApplication.findByIdAndUpdate(id, updatesToApply, {
    returnDocument: "after",
  });

  revalidatePath("/dashboard");

  return { data: JSON.parse(JSON.stringify(updated)) };
}

export async function deleteJobApplication(id: string) {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Server actions can run in a fresh process, and db.ts sets
  // bufferCommands: false, so queries fail unless we're connected first.
  await connectDB();

  const jobApplication = await JobApplication.findById(id);

  if (!jobApplication) {
    return { error: "Job application not found" };
  }

  if (jobApplication.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  await Column.findByIdAndUpdate(jobApplication.columnId, {
    $pull: { jobApplications: id },
  });

  await JobApplication.deleteOne({ _id: id });
  revalidatePath("/dashboard");

  return { success: true };
}
