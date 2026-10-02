export type Subtitle = {
  label: string;
  path: string;
};

export type Video = {
  id: string;
  name: string;
  path: string;
  section: string;
  subtitles: Subtitle[];
};

export type Section = {
  id: string;
  name: string;
  videos: Video[];
};

export type Course = {
  id: string;
  title: string;
  sections: Section[];
  totalVideos: number;
};

export type Library = {
  root: string;
  courses: Course[];
  totalVideos: number;
};
