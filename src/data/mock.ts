// Domain types only. Runtime data now comes from Supabase via AppStateContext.

export type Student = {
  id: string;
  name: string;
  batch: string;
  branch: string;
  teamId: string;
  avatar: string;
};

export type Team = {
  id: string;
  name: string;
  color: string;
  captainId: string;
  motto: string;
};

export type Exam = {
  id: string;
  name: string;
  date: string;
  totalMarks: number;
  subject: string;
};

export type Mark = {
  studentId: string;
  examId: string;
  marks: number;
};
