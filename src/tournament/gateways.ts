import { ItgOnlineProxyGateway } from "../tournament/gateways/itg-online-proxy.gateway";
import { MatchGateway } from "@match/gateways/match.gateway";

export { ItgOnlineProxyGateway }
export { MatchGateway }

export const Gateways = [
    ItgOnlineProxyGateway,
    MatchGateway
];