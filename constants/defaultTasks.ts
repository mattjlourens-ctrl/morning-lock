export interface Task {
  id: string;
  label: string;
  recurring: boolean;
}

export const DEFAULT_TASKS: Task[] = [
  { id: '1', label: 'Drink a glass of water', recurring: true },
  { id: '2', label: 'Make your bed', recurring: true },
  { id: '3', label: 'Meditate for 5 minutes', recurring: true },
  { id: '4', label: 'Write in your journal', recurring: true },
  { id: '5', label: 'Stretch for 5 minutes', recurring: true },
];
