
export interface PersonalSecurityChecklist {
  sections: Section[],
}

export type Sections = Section[];

export type PriorityKey = 'basic' | 'essential' | 'recommended' | 'optional' | 'advanced';
export type Priority = PriorityKey | 'Basic' | 'Essential' | 'Recommended' | 'Optional' | 'Advanced';

export interface Section {
  title: string,
  slug: string,
  description: string,
  intro: string,
  icon: string,
  color: string,
  checklist: Checklist[],
}

export interface Checklist {
  id?: string,
  point: string,
  priority: Priority,
  details: string,
  impact?: string,
  effort?: string,
  cadence?: string,
}
