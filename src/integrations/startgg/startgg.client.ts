import {
    BadGatewayException,
    HttpException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    StartggEntrantNode,
    StartggEventNode,
    StartggSeedNode,
    StartggSetNode,
} from './startgg.types';

type GraphqlResponse<T> = {
    data?: T;
    errors?: Array<{ message?: string }>;
};

type PageInfo = {
    total?: number;
    totalPages?: number;
};

@Injectable()
export class StartggClient {
    private readonly endpoint: string;
    private readonly accessToken?: string;
    private readonly perPage: number;
    private readonly minIntervalMs: number;
    private lastRequestAt = 0;

    constructor(private readonly configService: ConfigService) {
        this.endpoint = this.configService.get<string>('STARTGG_API_URL') ?? 'https://api.start.gg/gql/alpha';
        this.accessToken = this.configService.get<string>('STARTGG_ACCESS_TOKEN');
        this.perPage = Number(this.configService.get<string>('STARTGG_PER_PAGE') ?? 64);
        this.minIntervalMs = Number(this.configService.get<string>('STARTGG_MIN_INTERVAL_MS') ?? 800);
    }

    async getEventBySlug(slug: string): Promise<StartggEventNode> {
        const response = await this.request<{
            event?: {
                id: string | number;
                name: string;
                slug?: string | null;
                tournament?: {
                    id: string | number;
                    name: string;
                    slug?: string | null;
                } | null;
                phases?: Array<{
                    id: string | number;
                    name: string;
                }> | null;
            } | null;
        }>(
            `
            query GetEventBySlug($slug: String!) {
              event(slug: $slug) {
                id
                name
                slug
                tournament {
                  id
                  name
                  slug
                }
                phases {
                  id
                  name
                }
              }
            }
            `,
            { slug },
        );

        const event = response.event;
        if (!event?.id || !event?.name) {
            throw new BadGatewayException('start.gg response did not contain an event');
        }

        return {
            id: String(event.id),
            name: event.name,
            slug: event.slug ?? slug,
            tournament: event.tournament?.id && event.tournament?.name
                ? {
                    id: String(event.tournament.id),
                    name: event.tournament.name,
                    slug: event.tournament.slug ?? null,
                }
                : null,
            phases: (event.phases ?? [])
                .filter((phase) => phase?.id && phase?.name)
                .map((phase) => ({
                    id: String(phase.id),
                    name: phase.name,
                })),
        };
    }

    async getEventEntrants(eventId: string): Promise<StartggEntrantNode[]> {
        return this.paginate<StartggEntrantNode>(
            async (page, perPage) => {
                const response = await this.request<{
                    event?: {
                        entrants?: {
                            pageInfo?: PageInfo | null;
                            nodes?: Array<{
                                id: string | number;
                                name?: string | null;
                                participants?: Array<{
                                    id: string | number;
                                    gamerTag?: string | null;
                                }> | null;
                            }> | null;
                        } | null;
                    } | null;
                }>(
                    `
                    query EventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
                      event(id: $eventId) {
                        entrants(query: { page: $page, perPage: $perPage }) {
                          pageInfo {
                            total
                            totalPages
                          }
                          nodes {
                            id
                            name
                            participants {
                              id
                              gamerTag
                            }
                          }
                        }
                      }
                    }
                    `,
                    { eventId, page, perPage },
                );

                const entrants = response.event?.entrants;
                return {
                    pageInfo: entrants?.pageInfo ?? {},
                    nodes: (entrants?.nodes ?? [])
                        .filter((entrant) => entrant?.id)
                        .map((entrant) => {
                            const participants = (entrant.participants ?? [])
                                .filter((participant) => participant?.id && participant?.gamerTag)
                                .map((participant) => ({
                                    id: String(participant.id),
                                    gamerTag: String(participant.gamerTag),
                                }));
                            return {
                                id: String(entrant.id),
                                name: entrant.name?.trim() || participants.map((participant) => participant.gamerTag).join(' / ') || `Entrant ${entrant.id}`,
                                participants,
                            };
                        }),
                };
            },
        );
    }

    async getPhaseSeeds(phaseId: string): Promise<StartggSeedNode[]> {
        return this.paginate<StartggSeedNode>(
            async (page, perPage) => {
                const response = await this.request<{
                    phase?: {
                        seeds?: {
                            pageInfo?: PageInfo | null;
                            nodes?: Array<{
                                id: string | number;
                                seedNum?: number | null;
                                entrant?: {
                                    id: string | number;
                                    name?: string | null;
                                    participants?: Array<{
                                        id: string | number;
                                        gamerTag?: string | null;
                                    }> | null;
                                } | null;
                            }> | null;
                        } | null;
                    } | null;
                }>(
                    `
                    query PhaseSeeds($phaseId: ID!, $page: Int!, $perPage: Int!) {
                      phase(id: $phaseId) {
                        seeds(query: { page: $page, perPage: $perPage }) {
                          pageInfo {
                            total
                            totalPages
                          }
                          nodes {
                            id
                            seedNum
                            entrant {
                              id
                              name
                              participants {
                                id
                                gamerTag
                              }
                            }
                          }
                        }
                      }
                    }
                    `,
                    { phaseId, page, perPage },
                );

                const seeds = response.phase?.seeds;
                return {
                    pageInfo: seeds?.pageInfo ?? {},
                    nodes: (seeds?.nodes ?? [])
                        .filter((seed) => seed?.id && seed?.seedNum !== null && seed?.seedNum !== undefined)
                        .map((seed) => ({
                            id: String(seed.id),
                            seedNum: Number(seed.seedNum),
                            entrant: seed.entrant?.id ? {
                                id: String(seed.entrant.id),
                                name: seed.entrant.name?.trim() || (seed.entrant.participants ?? []).map((participant) => participant?.gamerTag).filter(Boolean).join(' / '),
                                participants: (seed.entrant.participants ?? [])
                                    .filter((participant) => participant?.id && participant?.gamerTag)
                                    .map((participant) => ({
                                        id: String(participant.id),
                                        gamerTag: String(participant.gamerTag),
                                    })),
                            } : null,
                        })),
                };
            },
        );
    }

    async getEventSets(eventId: string): Promise<StartggSetNode[]> {
        return this.paginate<StartggSetNode>(
            async (page, perPage) => {
                const response = await this.request<{
                    event?: {
                        sets?: {
                            pageInfo?: PageInfo | null;
                            nodes?: Array<{
                                id: string | number;
                                fullRoundText?: string | null;
                                phaseGroup?: {
                                    id: string | number;
                                    displayIdentifier?: string | null;
                                    phase?: {
                                        id: string | number;
                                        name?: string | null;
                                    } | null;
                                } | null;
                                slots?: Array<{
                                    entrant?: {
                                        id: string | number;
                                        name?: string | null;
                                    } | null;
                                }> | null;
                            }> | null;
                        } | null;
                    } | null;
                }>(
                    `
                    query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) {
                      event(id: $eventId) {
                        sets(page: $page, perPage: $perPage, sortType: STANDARD) {
                          pageInfo {
                            total
                            totalPages
                          }
                          nodes {
                            id
                            fullRoundText
                            phaseGroup {
                              id
                              displayIdentifier
                              phase {
                                id
                                name
                              }
                            }
                            slots {
                              entrant {
                                id
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                    `,
                    { eventId, page, perPage },
                );

                const sets = response.event?.sets;
                return {
                    pageInfo: sets?.pageInfo ?? {},
                    nodes: (sets?.nodes ?? [])
                        .filter((set) => set?.id)
                        .map((set) => ({
                            id: String(set.id),
                            fullRoundText: set.fullRoundText ?? null,
                            phaseId: set.phaseGroup?.phase?.id ? String(set.phaseGroup.phase.id) : null,
                            phaseName: set.phaseGroup?.phase?.name ?? null,
                            phaseGroupId: set.phaseGroup?.id ? String(set.phaseGroup.id) : null,
                            phaseGroupName: set.phaseGroup?.displayIdentifier ?? null,
                            entrants: (set.slots ?? [])
                                .filter((slot) => slot?.entrant?.id)
                                .map((slot) => ({
                                    id: String(slot.entrant.id),
                                    name: slot.entrant.name?.trim() || `Entrant ${slot.entrant.id}`,
                                })),
                        })),
                };
            },
        );
    }

    private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
        if (!this.accessToken) {
            throw new InternalServerErrorException('STARTGG_ACCESS_TOKEN is not configured');
        }

        await this.throttle();

        const maxAttempts = 4;
        let attempt = 0;
        let delayMs = 1000;

        while (attempt < maxAttempts) {
            attempt += 1;

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.accessToken}`,
                },
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });

            if (response.status === 429) {
                if (attempt >= maxAttempts) {
                    throw new HttpException('start.gg rate limit exceeded', 429);
                }
                await this.sleep(delayMs);
                delayMs *= 2;
                continue;
            }

            if (!response.ok) {
                const body = await response.text();
                if (response.status >= 500 && attempt < maxAttempts) {
                    await this.sleep(delayMs);
                    delayMs *= 2;
                    continue;
                }
                throw new BadGatewayException(`start.gg request failed with status ${response.status}: ${body}`);
            }

            const json = await response.json() as GraphqlResponse<T>;
            if (json.errors?.length) {
                const message = json.errors.map((error) => error.message).filter(Boolean).join('; ') || 'Unknown start.gg GraphQL error';
                throw new BadGatewayException(message);
            }

            if (!json.data) {
                throw new BadGatewayException('start.gg response was missing data');
            }

            return json.data;
        }

        throw new BadGatewayException('start.gg request failed');
    }

    private async paginate<T>(
        fetchPage: (page: number, perPage: number) => Promise<{ pageInfo: PageInfo; nodes: T[] }>,
    ): Promise<T[]> {
        const nodes: T[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const { pageInfo, nodes: pageNodes } = await fetchPage(page, this.perPage);
            nodes.push(...pageNodes);

            if (pageInfo.totalPages) {
                totalPages = pageInfo.totalPages;
            } else if (pageInfo.total !== undefined) {
                totalPages = Math.max(1, Math.ceil(pageInfo.total / this.perPage));
            } else {
                totalPages = page;
            }

            page += 1;
        }

        return nodes;
    }

    private async throttle(): Promise<void> {
        const now = Date.now();
        const waitMs = this.lastRequestAt + this.minIntervalMs - now;
        if (waitMs > 0) {
            await this.sleep(waitMs);
        }
        this.lastRequestAt = Date.now();
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}
