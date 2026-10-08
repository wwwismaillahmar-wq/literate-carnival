export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export interface NotificationRequest {
  recipientId: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}
