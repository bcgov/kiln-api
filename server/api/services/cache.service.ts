import EventEmitter from 'events';
import { createClient } from 'redis';
import { formDefinitionSchema } from '../../schema/form';
import { fieldValueSchema } from '../../schema/formElements';
import z from 'zod';
import L from '../../common/logger';

type FileData = {
  fileId: string;
  originalName: string;
}[];

const attachmentCacheSchema = z.object({
  attachment: z.object({
    data: z.record(z.string(), fieldValueSchema),
    form_definition: formDefinitionSchema,
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  files: z.array(
    z.object({
      fileId: z.string(),
      originalName: z.string(),
    })
  ),
});

export class CacheService {
  public client;
  public subscriber;
  private TTL = 60;
  public events = new EventEmitter();
  constructor() {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT
      ? parseInt(process.env.REDIS_PORT)
      : 6379;
    this.client = createClient({
      socket: {
        host,
        port,
      },
      password: process.env.REDIS_PASSWORD,
    });
    this.subscriber = this.client.duplicate();
  }

  async connect() {
    await this.client.connect();
    await this.subscriber.connect();
    await this.client.configSet('notify-keyspace-events', 'Ex');

    await this.subscriber.subscribe('__keyevent@0__:expired', (key) =>
      this.handleExpiry(key)
    );
  }

  private async handleExpiry(key: string) {
    if (!key.startsWith('attachment:')) return;

    const attachmentId = key.split(':')[1];
    this.events.emit('expiry', attachmentId);
  }

  async setAttachment(
    attachmentId: string,
    attachment: unknown,
    files: FileData
  ) {
    const attachmentResult = attachmentCacheSchema.safeParse({attachment, files});
    if (attachmentResult.error) {
      throw new Error(
        `Schema error setting cache for ${attachmentId}\n ${z.prettifyError(
          attachmentResult.error
        )}`
      );
    }
    // remove key: undefined values (technically not possible since the origin will be json anyway)
    const trimmedAttachment = JSON.parse(JSON.stringify(attachment));
    await this.client.json.set(`attachment:${attachmentId}`, '$', {
      attachment: trimmedAttachment,
      files,
    });
    await this.client.expire(`attachment:${attachmentId}`, this.TTL);
    return this.TTL;
  }

  async getAttachment(attachmentId: string) {
    const attachmentData = await this.client.json.get(
      `attachment:${attachmentId}`
    );
    if (!attachmentData) {
      return false;
    }
    await this.client.expire(`attachment:${attachmentId}`, this.TTL);
    const attachment = attachmentCacheSchema.safeParse(attachmentData);
    if (attachment.error) {
      L.warn(
        `Schema error in attachment cache for ${attachmentId}\n`,
        z.prettifyError(attachment.error)
      );
      return false;
    }
    return {
      ...attachment.data,
      TTL: this.TTL,
    };
  }

  async addFile(
    attachmentId: string,
    file: { fileId: string; originalName: string }
  ) {
    if (await this.client.exists(`attachment:${attachmentId}`)) {
      await this.client.json.arrAppend(
        `attachment:${attachmentId}`,
        '$.files',
        file
      );
    } else {
      this.setAttachment(attachmentId, null, [file]);
    }

    await this.client.expire(`attachment:${attachmentId}`, this.TTL);
    return this.TTL;
  }
}
const cache = new CacheService();
(async () => {
  await cache.connect();
})();

export default cache;
