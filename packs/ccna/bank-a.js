/* CCNA Exam A — 100 original questions, ids a001–a100. Authored in two halves (domains 1/2/6 and 3/4/5);
   the exam runner shuffles item order and option order at sitting time. Schema: dev/specs/ccna.md §6. */
import { CCNA_BANK_A_P1 } from "./bank-a.p1.js";
import { CCNA_BANK_A_P2 } from "./bank-a.p2.js";
export const CCNA_BANK_A = [...CCNA_BANK_A_P1, ...CCNA_BANK_A_P2];
