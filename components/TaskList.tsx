import React from 'react';
import { View } from 'react-native';
import { TaskItem } from './TaskItem';
import type { Task } from '@/constants/defaultTasks';

interface Props {
  tasks: Task[];
  completedIds: string[];
  onToggle: (id: string) => void;
}

export function TaskList({ tasks, completedIds, onToggle }: Props) {
  return (
    <View>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          completed={completedIds.includes(task.id)}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}
