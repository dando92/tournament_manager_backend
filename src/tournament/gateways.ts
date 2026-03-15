import { ItgOnlineProxyGateway } from "../tournament/gateways/itg-online-proxy.gateway";
import { MatchGateway } from "../tournament/gateways/match.gateway";

export { ItgOnlineProxyGateway }
export { MatchGateway }

export const Gateways = [
    ItgOnlineProxyGateway,
    MatchGateway
];