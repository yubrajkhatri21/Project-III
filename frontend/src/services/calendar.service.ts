import { crmService } from './crm.service';

export interface CalendarEventRecord {
    id: string;
    date: string;
    title: string;
    type: string;
    meetingTime?: string;
    meetingDuration?: string;
    location?: string;
    customerName: string;
    status: string;
    priority: string;
    deadline?: string;
    progress: string;
    notes: string;
}

const toTaskPayload = (event: Omit<CalendarEventRecord, 'id'>) => ({
    title: event.title,
    dueDate: event.date,
    priority: event.priority,
    status: event.status,
    type: 'CalendarEvent',
    customerName: event.customerName,
    description: JSON.stringify({
        type: event.type,
        meetingTime: event.meetingTime,
        meetingDuration: event.meetingDuration,
        location: event.location,
        deadline: event.deadline,
        progress: event.progress,
        notes: event.notes
    })
});

const fromTaskRecord = (record: any): CalendarEventRecord => {
    let metadata: Record<string, unknown> = {};
    try {
        metadata = record.description ? JSON.parse(record.description) : {};
    } catch {
        metadata = {};
    }

    return {
        id: record.id,
        date: record.dueDate || '',
        title: record.title || '',
        type: String(metadata.type || 'Internal Task'),
        meetingTime: typeof metadata.meetingTime === 'string' ? metadata.meetingTime : '',
        meetingDuration: typeof metadata.meetingDuration === 'string' ? metadata.meetingDuration : '',
        location: typeof metadata.location === 'string' ? metadata.location : '',
        customerName: record.customerName || '',
        status: record.status || 'New Lead',
        priority: record.priority || 'Medium',
        deadline: typeof metadata.deadline === 'string' ? metadata.deadline : '',
        progress: typeof metadata.progress === 'string' ? metadata.progress : 'Not Started',
        notes: typeof metadata.notes === 'string' ? metadata.notes : ''
    };
};

export const calendarService = {
    list: async (): Promise<CalendarEventRecord[]> => {
        const tasks = await crmService.list<any>('tasks');
        return tasks.filter(task => task.type === 'CalendarEvent').map(fromTaskRecord);
    },
    create: async (event: Omit<CalendarEventRecord, 'id'>): Promise<CalendarEventRecord> => {
        const record = await crmService.create<any>('tasks', toTaskPayload(event));
        return fromTaskRecord(record);
    },
    update: async (event: CalendarEventRecord): Promise<CalendarEventRecord> => {
        const record = await crmService.update<any>('tasks', event.id, toTaskPayload(event));
        return fromTaskRecord(record);
    },
    archive: (id: string) => crmService.archive('tasks', id)
};
