/* CCNA Exam B — 100 original questions, ids b001–b100. Authored in two halves (domains 1/2/6 and 3/4/5);
   the exam runner shuffles item order and option order at sitting time. Schema: dev/specs/ccna.md §6. */
import { CCNA_BANK_B_P1 } from "./bank-b.p1.js";
import { CCNA_BANK_B_P2 } from "./bank-b.p2.js";
export const CCNA_BANK_B = [...CCNA_BANK_B_P1, ...CCNA_BANK_B_P2];
