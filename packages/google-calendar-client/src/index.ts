import { GoogleAuth } from 'google-auth-library';
import { calendar, calendar_v3 } from '@googleapis/calendar';

interface Logger {
	info(obj: object | string, msg?: string): void;
	warn(obj: object | string, msg?: string): void;
	error(obj: object | string, msg?: string): void;
}

const consoleLogger: Logger = {
	info: (obj, msg) => console.info(msg ?? obj, typeof obj === 'object' ? obj : ''),
	warn: (obj, msg) => console.warn(msg ?? obj, typeof obj === 'object' ? obj : ''),
	error: (obj, msg) => console.error(msg ?? obj, typeof obj === 'object' ? obj : ''),
};

type CalendarClientOptions = {
	serviceAccountJson: string;
	defaultCalendarId?: string;
	logger?: Logger;
};

type CreateCalendarOptions = {
	title: string;
	timeZone?: string;
};

export class GoogleCalendarClient {
	#client: ReturnType<typeof calendar> | null = null;
	#options: CalendarClientOptions | null = null;
	#logger: Logger = consoleLogger;

	get #c() {
		if (!this.#client) throw new Error('CalendarClient not initialized — call init() first');
		return this.#client;
	}

	/** Resolves a calendar ID, falling back to the configured default. */
	#resolveId(calendarId?: string): string {
		const id = calendarId ?? this.#options?.defaultCalendarId;
		if (!id) throw new Error('No calendarId provided and no defaultCalendarId configured');
		return id;
	}

	configure(options: CalendarClientOptions) {
		this.#options = options;
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
	}

	/** Creates a new calendar and returns its ID. */
	async createCalendar({ title, timeZone = 'Europe/Vilnius' }: CreateCalendarOptions): Promise<string> {
		const res = await this.#c.calendars.insert({
			requestBody: { summary: title, timeZone }
		});
		const id = res.data.id!;
		this.#logger.info({ calendarId: id }, 'Created calendar');
		return id;
	}

	async deleteCalendar(calendarId: string): Promise<void> {
		await this.#c.calendars.delete({ calendarId });
		this.#logger.info({ calendarId }, 'Deleted calendar');
	}

	// ── ACL ──────────────────────────────────────────────────────────────────

	async listAcls(calendarId?: string): Promise<calendar_v3.Schema$AclRule[]> {
		try {
			const res = await this.#c.acl.list({ calendarId: this.#resolveId(calendarId) });
			return res.data.items ?? [];
		} catch (err) {
			const error = err as { code?: number; message?: string };
			this.#logger.error({ err: error.message }, 'Failed to list ACLs');
			throw err;
		}
	}

	async listPeople(calendarId?: string) {
		const res = await this.#c.acl.list({ calendarId: this.#resolveId(calendarId) });
		return (
			res.data.items?.map((item) => ({
				email: item.scope?.value,
				type: item.scope?.type,
				role: item.role
			})) ?? []
		);
	}

	async invitePerson({
		email,
		role = 'reader',
		calendarId
	}: {
		email: string;
		role?: 'reader' | 'writer' | 'owner';
		calendarId?: string;
	}) {
		const id = this.#resolveId(calendarId);
		const res = await this.#c.acl.insert({
			calendarId: id,
			sendNotifications: true,
			requestBody: { role, scope: { type: 'user', value: email } }
		});
		this.#logger.info(`Invited ${email} to calendar ${id} with role: ${role}`);
		return res.data;
	}

	async deletePerson({ email, calendarId }: { email: string; calendarId?: string }) {
		const id = this.#resolveId(calendarId);
		const aclList = await this.#c.acl.list({ calendarId: id });
		const rule = aclList.data.items?.find(
			(r) => r.scope?.type === 'user' && r.scope?.value === email
		);

		if (!rule?.id) {
			this.#logger.warn(`No ACL found for ${email} on calendar ${id}`);
			return;
		}

		await this.#c.acl.delete({ calendarId: id, ruleId: rule.id });
		this.#logger.info(`Removed ${email} from calendar ${id}`);
	}

	// ── Events ───────────────────────────────────────────────────────────────

	async listEvents(calendarId?: string) {
		const res = await this.#c.events.list({
			calendarId: this.#resolveId(calendarId),
			timeMin: new Date().toISOString(),
			singleEvents: true,
			orderBy: 'startTime'
		});
		return res.data.items;
	}

	async insertEvent({
		event,
		calendarId
	}: {
		event: calendar_v3.Schema$Event;
		calendarId?: string;
	}): Promise<calendar_v3.Schema$Event> {
		const res = await this.#c.events.insert({
			calendarId: this.#resolveId(calendarId),
			sendNotifications: false,
			requestBody: event
		});
		return res.data;
	}

	async updateEvent({
		eventId,
		event,
		calendarId
	}: {
		eventId: string;
		event: calendar_v3.Schema$Event;
		calendarId?: string;
	}): Promise<calendar_v3.Schema$Event> {
		const res = await this.#c.events.update({
			calendarId: this.#resolveId(calendarId),
			eventId,
			sendUpdates: 'none',
			requestBody: event
		});
		return res.data;
	}

	async deleteEvent({ eventId, calendarId }: { eventId: string; calendarId?: string }) {
		const id = this.#resolveId(calendarId);
		try {
			await this.#c.events.delete({ calendarId: id, eventId, sendUpdates: 'none' });
			this.#logger.info(`Removed event ${eventId} from calendar ${id}`);
		} catch (err) {
			const error = err as { code?: number };
			if (error.code === 410) {
				this.#logger.info(`Event ${eventId} already deleted (410)`);
				return;
			}
			throw err;
		}
	}

	async clearAllEvents(calendarId?: string) {
		const id = this.#resolveId(calendarId);
		this.#logger.info(`Clearing all events from calendar ${id}`);
		const events = (await this.listEvents(id)) ?? [];

		if (events.length === 0) {
			this.#logger.info('Nothing to delete :)');
			return;
		}

		for (const event of events) {
			if (event.id) {
				this.#logger.info('Deleting event: ' + event.id);
				await this.deleteEvent({ eventId: event.id, calendarId: id });
			}
		}
	}
}
