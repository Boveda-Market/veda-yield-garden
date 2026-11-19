import { common } from "./en/common";
import { app } from "./en/app";
import { realOps } from "./en/real-ops";
import { account } from "./en/account";
import { pages } from "./en/pages";
import { legal } from "./en/legal";
import { extra } from "./en/extra";
import { more } from "./en/more";
import { noTrial } from "./en/no-trial";
import { rangeVaults } from "./en/range-vaults";
import { guides } from "./en/guides";

/** English dictionary keyed by the original Spanish source text. Each area owns its own file. */
export const en: Record<string, string> = { ...common, ...app, ...realOps, ...account, ...pages, ...legal, ...extra, ...more, ...noTrial, ...rangeVaults, ...guides };
