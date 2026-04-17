import { StartggSeedNode } from '../startgg.types';
import { PageInfo } from './page-info.response';

export class PhaseSeedsResponse {
    phase?: {
        seeds?: {
            pageInfo?: PageInfo | null;
            nodes?: Array<{
                id: string | number;
                seedNum?: number | null;
                entrant?: {
                    id: string | number;
                } | null;
            }> | null;
        } | null;
    } | null;

    static mapPage(data: PhaseSeedsResponse): { pageInfo: PageInfo; nodes: StartggSeedNode[] } {
        const seeds = data.phase?.seeds;
        return {
            pageInfo: seeds?.pageInfo ?? {},
            nodes: (seeds?.nodes ?? [])
                .filter((seed) =>
                    seed?.id &&
                    seed?.seedNum !== null &&
                    seed?.seedNum !== undefined &&
                    seed?.entrant?.id,
                )
                .map((seed) => ({
                    id: String(seed.id),
                    seedNum: Number(seed.seedNum),
                    entrantId: String(seed.entrant!.id),
                })),
        };
    }
}
