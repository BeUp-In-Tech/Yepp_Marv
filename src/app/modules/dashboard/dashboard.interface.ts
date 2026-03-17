

export interface IDashBoardNotificationPayload {
    title: string;
    message: string;
    channel: {
        push?: boolean;
        email?: boolean;
    },

    to: {
        all_users?: boolean;
        active_vendors?: boolean;
    }
}
