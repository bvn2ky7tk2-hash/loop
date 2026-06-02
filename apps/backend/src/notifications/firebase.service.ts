import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: import('firebase-admin/messaging').Messaging | null = null;

  async onModuleInit() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM disabled');
      return;
    }
    try {
      const admin = await import('firebase-admin');
      const serviceAccount = JSON.parse(serviceAccountJson) as import('firebase-admin').ServiceAccount;
      const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      const { getMessaging } = await import('firebase-admin/messaging');
      this.messaging = getMessaging(app);
    } catch (e) {
      this.logger.error('Failed to init Firebase', e);
    }
  }

  async sendToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!this.messaging || !tokens.length) return;
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));
    for (const chunk of chunks) {
      await this.messaging
        .sendEachForMulticast({ tokens: chunk, notification: { title, body }, data })
        .catch((e) => this.logger.error('FCM send failed', e));
    }
  }
}
