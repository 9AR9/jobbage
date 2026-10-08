"use client";

import { useEffect, useState } from "react";
import { Board, Column, JobApplication } from "../models/models.types";
import { updateJobApplication } from "../actions/job-applications";
import { JOB_ORDER_STEP } from "../constants";

export function useBoard(initialBoard?: Board | null) {
  const [board, setBoard] = useState<Board | null>(initialBoard || null);
  const [columns, setColumns] = useState<Column[]>(initialBoard?.columns || []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBoard) {
      setBoard(initialBoard);
      setColumns(initialBoard.columns || []);
    }
  }, [initialBoard]);

  async function moveJob(
    jobApplicationId: string,
    newColumnId: string,
    newOrder: number,
  ) {
    // Snapshot so a failed server update can put the board back as it was.
    const previousColumns = columns;
    setError(null);

    setColumns((previous) => {
      const newColumns = previous.map((column) => ({
        ...column,
        jobApplications: [...column.jobApplications],
      }));

      // Find and remove job from the old column

      let jobToMove: JobApplication | null = null;
      let oldColumnId: string | null = null;

      for (const column of newColumns) {
        const jobIndex = column.jobApplications.findIndex(
          (job) => job._id === jobApplicationId,
        );
        if (jobIndex !== -1 && jobIndex !== undefined) {
          jobToMove = column.jobApplications[jobIndex];
          oldColumnId = column._id;
          column.jobApplications = column.jobApplications.filter(
            (job) => job._id !== jobApplicationId,
          );
          break;
        }
      }

      if (jobToMove && oldColumnId) {
        const targetColumnIndex = newColumns.findIndex(
          (column) => column._id === newColumnId,
        );
        if (targetColumnIndex !== -1) {
          const targetColumn = newColumns[targetColumnIndex];
          const currentJobs = targetColumn.jobApplications || [];

          const updatedJobs = [...currentJobs];
          updatedJobs.splice(newOrder, 0, {
            ...jobToMove,
            columnId: newColumnId,
            order: newOrder * JOB_ORDER_STEP,
          });

          const jobsWithUpdatedOrders = updatedJobs.map((job, index) => ({
            ...job,
            order: index * JOB_ORDER_STEP,
          }));

          newColumns[targetColumnIndex] = {
            ...targetColumn,
            jobApplications: jobsWithUpdatedOrders,
          };
        }
      }

      return newColumns;
    });

    try {
      const result = await updateJobApplication(jobApplicationId, {
        columnId: newColumnId,
        order: newOrder,
      });

      if (result.error) {
        setColumns(previousColumns);
        setError(result.error);
      }
    } catch (error) {
      console.error("Error", error);
      setColumns(previousColumns);
      setError("Failed to move job application");
    }
  }

  return { board, columns, error, moveJob };
}
