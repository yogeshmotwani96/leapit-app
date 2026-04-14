export type AttendanceLog = {
  id: string;
  user_id: string;
  date: string;
  time_in: string;
  time_out: string | null;
};
