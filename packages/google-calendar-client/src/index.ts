import { GoogleAuth } from 'google-auth-library';
import { calendar, calendar_v3 } from '@googleapis/calendar';

interface Logger {
	info(obj: object | string, msg?: string): void;
	warn(obj: object | string, msg?: string): void;
	error(obj: object | string, msg?: string): void;
}

export const consoleLogger: Logger = {
	info: (obj, msg) => console.info(msg ?? obj, typeof obj === 'object' ? obj : ''),
	warn: (obj, msg) => console.warn(msg ?? obj, typeof obj === 'object' ? obj : ''),
	error: (obj, msg) => console.error(msg ?? obj, typeof obj === 'object' ? obj : ''),
};

type CalendarClientOptions = {
	serviceAccountJson: string;
	calendarId?: string;
	calendarTitle?: string;
	timeZone?: string;
	logger?: Logger;
};

export class CalendarClient {
	#client: ReturnType<typeof calendar> | null = null;
	#calendarId: string | null = null;
	#options: CalendarClientOptions | null = null;
	#logger: Logger = consoleLogger;

	get #c() {
		if (!this.#client) throw new Error('CalendarClient not initialized — call init() first');
		return this.#client;
	}

	get #id() {
		if (!this.#calendarId) throw new Error('Calendar ID not available');
		return this.#calendarId;
	}

	configure(options: CalendarClientOptions) {
		this.#options = options;
		this.#calendarId = options.calendarId ?? null;
		if (options.logger) this.#logger = options.logger;
	}

	async init() {
		if (!this.#options) throw new Error('CalendarClient not configured — call configure() first');
		if (this.#client) return;

		const auth = new GoogleAuth({
			credentials: JSON.parse(this.#options.serviceAccountJson),
			scopes: ['https://www.googleapis.com/auth/calendar']
		});

		this.#client = calendar({ auth, version: 'v3' });

		if (!this.#calendarId) {
			const res = await this.#c.calendars.insert({
				requestBody: {
					summary: this.#options.calendarTitle,
					timeZone: this.#options.timeZone ?? 'Europe/Vilnius'
				}
			});
			this.#calendarId = res.data.id!;
			this.#logger.info({ calendarId: this.#calendarId }, 'Initialized App Calendar ID');
		}
	}

	async listAcls(): Promise<calendar_v3.Schema$AclRule[]> {
		try {
			const res = await this.#c.acl.list({ calendarId: this.#id });
			return res.data.items ?? [];
		} catch (err) {
			const error = err as { code?: number; message?: string };
			this.#logger.error({ err: error.message }, 'Failed to list ACLs');
			throw err;
		}
	}

	async deletePerson({ email }: { email: string }) {
		const aclList = await this.#c.acl.list({ calendarId: this.#id });
		const rule = aclList.data.items?.find(
			(r) => r.scope?.type === 'user' && r.scope?.value === email
		);

		if (!rule?.id) {
			this.#logger.warn(`No ACL found for ${email}`);
			return;
		}

		await this.#c.acl.delete({ calendarId: this.#id, ruleId: rule.id });
		this.#logger.info(`Removed ${email} from calendar ACL`);
	}

	async listEvents() {
		const res = await this.#c.events.list({
			calendarId: this.#id,
			timeMin: new Date().toISOString(),
			singleEvents: true,
			orderBy: 'startTime'
		});
		return res.data.items;
	}

	async listPeople() {
		const res = await this.#c.acl.list({ calendarId: this.#id });
		return (
			res.data.items?.map((item) => ({
				email: item.scope?.value,
				type: item.scope?.type,
				role: item.role
			})) ?? []
		);
	}

	async insertEvent(event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event> {
		const res = await this.#c.events.insert({
			calendarId: this.#id,
			sendNotifications: false,
			requestBody: event
		});
		return res.data;
	}

	async updateEvent({ eventId, event }: { eventId: string; event: calendar_v3.Schema$Event }): Promise<calendar_v3.Schema$Event> {
		const res = await this.#c.events.update({
			calendarId: this.#id,
			eventId,
			sendUpdates: 'none',
			requestBody: event
		});
		return res.data;
	}

	async deleteEvent(eventId: string) {
		try {
			await this.#c.events.delete({
				calendarId: this.#id,
				eventId,
				sendUpdates: 'none'
			});
			this.#logger.info(`Removed event ${eventId} from calendar`);
		} catch (err) {
			const error = err as { code?: number };
			if (error.code === 410) {
				this.#logger.info(`Event ${eventId} already deleted (410)`);
				return;
			}
			throw err;
		}
	}

	async clearAllEvents() {
		this.#logger.info('Clearing all google events!!!');
		const events = (await this.listEvents()) ?? [];

		if (events.length === 0) {
			this.#logger.info('nothing to delete :)');
			return;
		}

		for (const event of events) {
			if (event.id) {
				this.#logger.info('deleting event: ' + event.id);
				await this.deleteEvent(event.id);
			}
		}
	}
}

export const calendarClient = new CalendarClient();
