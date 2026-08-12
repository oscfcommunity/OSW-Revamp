export interface Job {
  title: string;
  company: string;
  jobSlug: string;
  featured: boolean;
  skills: string[];
  experience: string;
  jobType: string;
  jobMode: string;
  location: string;
  companyWebsite: string;
  applyLink: string;
  postedOn: Date;
  description: string;
  aboutCompany: string;
  status: 'Open' | 'Closed';
  openings: string;
}
