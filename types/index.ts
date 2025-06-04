import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type WorkExperience = {
  company: string;
  title: string;
  description: string;
  isRemote?: boolean;
  startDate: string;
  endDate?: string;
  isPresent?: boolean;
};

export type Project = {
  name: string;
  description: string;
  link: string;
  image: string;
};
